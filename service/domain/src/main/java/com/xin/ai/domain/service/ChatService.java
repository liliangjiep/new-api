package com.xin.ai.domain.service;

import com.xin.ai.adapters.base.ModelAdapter;
import com.xin.ai.adapters.router.ChannelRouter;
import com.xin.ai.common.cache.RedisService;
import com.xin.ai.domain.catalog.Catalog;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 文本对话服务 —— Agent 的对话后端。
 * 行内注释1：优先走 DB 里配置的文本模型接入点（model_key = chat.text.*），
 *             命中就真调上游并流式吐字；没配置则退到本地「结构化应答」，
 *             保证前端 SSE 链路是通的、语义也是可用的（不是硬编码一句占位文案）。
 * 行内注释2：接了真实文本模型后，配置 model_endpoints 即可，本类无需改动。
 * 行内注释3：流式切分 —— 上游一次性返回全文时，按标点与长度切片，模拟逐字输出。
 */
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    /** 文本模型接入点前缀 —— 在后台「模型接入」里配 model_key = chat.text.<x> 即可接入。 */
    public static final String CHAT_MODEL_PREFIX = "chat.text.";

    /** 切片长度与间隔 —— 模拟流式观感。 */
    private static final int CHUNK_SIZE = 6;
    private static final long CHUNK_DELAY_MS = 28L;

    private final RelayConfigService relayConfig;
    private final com.xin.ai.adapters.adapters.RelayAdapter adapter;
    private final ChannelRouter router;
    private final RedisService redis;

    public ChatService(RelayConfigService relayConfig,
            com.xin.ai.adapters.adapters.RelayAdapter adapter,
            ChannelRouter router,
            RedisService redis) {
        this.relayConfig = relayConfig;
        this.adapter = adapter;
        this.router = router;
        this.redis = redis;
    }

    /**
     * 流式对话 —— 逐段回调文本。
     *
     * @param userId    用户
     * @param sessionId 会话
     * @param message   用户输入
     * @param skill     挂载技能（可选）
     * @param model     前端选的模型名（可选）
     * @param onToken   每段文本回调
     * @param onDone    完成回调（全量文本）
     */
    public void chat(String userId, String sessionId, String message, String skill, String model,
            Consumer<String> onToken, Consumer<String> onDone) {
        String full = reply(userId, message, skill, model);
        // 行内注释4：切片输出 —— 让前端拿到真正的「流式」体验，而不是一次性 await 完再显示。
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < full.length()) {
            int end = Math.min(full.length(), i + CHUNK_SIZE);
            // 行内注释4.1：优先在标点处断开，避免把词切碎。
            for (int j = end; j > i; j--) {
                char c = full.charAt(j - 1);
                if (c == '，' || c == '。' || c == '、' || c == '；' || c == '\n' || c == '：') {
                    end = j;
                    break;
                }
            }
            String chunk = full.substring(i, end);
            sb.append(chunk);
            onToken.accept(chunk);
            i = end;
            if (!sleep(CHUNK_DELAY_MS)) {
                break;
            }
        }
        onDone.accept(sb.toString());
    }

    /**
     * 生成回复全文。
     * 行内注释5：先试真实上游 —— 有 chat.text.* 接入点就调它；失败再落本地结构化应答。
     */
    public String reply(String userId, String message, String skill, String model) {
        String upstream = tryUpstream(message, skill, model);
        if (upstream != null && !upstream.isBlank()) {
            return upstream;
        }
        return localReply(message, skill, model);
    }

    /**
     * 调上游文本模型 —— 有配置才调。
     * 行内注释6：复用 model_endpoints 的多站回退能力 —— 文本站挂了自动切下一站。
     */
    private String tryUpstream(String message, String skill, String model) {
        String modelKey = resolveModelKey(model);
        try {
            List<ModelAdapter.EndpointSnapshot> candidates = relayConfig.resolveEndpoints(modelKey);
            if (candidates.isEmpty()) {
                // 行内注释6.1：没配具体模型时，试一个通用 key。
                candidates = relayConfig.resolveEndpoints(CHAT_MODEL_PREFIX + "default");
            }
            if (candidates.isEmpty()) {
                return null;
            }
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("prompt", message);
            params.put("messages", List.of(Map.of("role", "user", "content", message)));
            params.put("stream", false);
            if (skill != null && !skill.isBlank()) {
                params.put("skill", skill);
            }
            ChannelRouter.RoutePlan plan = router.plan(candidates, Map.of());
            ChannelRouter.FallbackResult res = router.submitWithFallback(plan.candidates(), ep -> {
                ModelAdapter.ModelRequest req =
                        new ModelAdapter.ModelRequest(ep, params, "chat-" + System.nanoTime(), null);
                return adapter.submit(req);
            });
            if (!res.ok()) {
                log.warn("文本模型上游失败，回落本地应答: {}", res.errorMessage());
                return null;
            }
            ModelAdapter.ModelResponse polled = adapter.poll(
                    new ModelAdapter.ModelRequest(res.used(), params, "chat-" + System.nanoTime(), null),
                    res.upstreamTaskId());
            String text = extractText(polled.raw());
            return text == null || text.isBlank() ? null : text;
        } catch (Exception e) {
            log.warn("文本模型调用异常，回落本地应答: {}", e.getMessage());
            return null;
        }
    }

    /** 从上游响应里挖出文本 —— 兼容 OpenAI 兼容的 choices[0].message.content。 */
    private String extractText(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        Object choices = raw.get("choices");
        if (choices instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
            Object msg = first.get("message");
            if (msg instanceof Map<?, ?> m && m.get("content") != null) {
                return String.valueOf(m.get("content"));
            }
            if (first.get("text") != null) {
                return String.valueOf(first.get("text"));
            }
        }
        Object content = raw.get("content");
        if (content != null) {
            return String.valueOf(content);
        }
        Object text = raw.get("text");
        return text == null ? null : String.valueOf(text);
    }

    /**
     * 本地结构化应答 —— 不是一句占位文案，而是按用户意图给出可执行的下一步。
     * 行内注释7：接入真实文本模型后这条路径基本不会走到；保留是为了离线/未配置时也能用。
     */
    public String localReply(String message, String skill, String model) {
        StringBuilder sb = new StringBuilder();
        String q = message == null ? "" : message.trim();
        sb.append("收到你的需求").append(q.isEmpty() ? "。" : "：" + q).append("\n\n");

        // 行内注释7.1：按关键词给方案 —— 命中不同意图给不同建议。
        String lower = q.toLowerCase();
        if (lower.contains("口播") || lower.contains("探店") || lower.contains("文案") || lower.contains("脚本")) {
            sb.append("【文案脚本】\n");
            sb.append("1. 钩子（前 3 秒）：用一个具体场景或反差抓住注意力\n");
            sb.append("2. 痛点：说清用户现在的麻烦，避免空泛形容词\n");
            sb.append("3. 方案：给出可验证的具体做法\n");
            sb.append("4. 行动：明确下一步（到店 / 私信 / 下单）\n\n");
        } else if (lower.contains("标题") || lower.contains("引流")) {
            sb.append("【标题建议】\n");
            for (int i = 1; i <= 3; i++) {
                sb.append(i).append(". 数字/地域 + 痛点 + 结果 —— 例如「本地人常去的 3 家…」。\n");
            }
            sb.append("\n");
        } else if (lower.contains("爆款") || lower.contains("分析") || lower.contains("为什么")) {
            sb.append("【拆解框架】\n");
            sb.append("· 前 3 秒钩子类型（悬念 / 反差 / 利益点）\n");
            sb.append("· 节奏密度（平均镜头时长、是否有卡点）\n");
            sb.append("· 转化设计（结尾行动指令）\n");
            sb.append("· 可复用模板：把它抽象成一个可批量套用的脚本骨架\n\n");
        } else {
            sb.append("【通用创作建议】\n");
            sb.append("· 明确目标受众与使用场景\n");
            sb.append("· 一条主线，不要塞多个卖点\n");
            sb.append("· 输出物与画面、时长、比例对齐\n\n");
        }

        if (skill != null && !skill.isBlank()) {
            sb.append("已挂载技能「").append(skill).append("」");
            sb.append(skill.contains("视频") || skill.contains("图片")
                    ? "，可以直接到对应工具页精调参数后提交生成。\n"
                    : "，建议先按上面的框架产出脚本，再用工具页生成成片。\n");
        }
        if (model != null && !model.isBlank()) {
            sb.append("当前模型：").append(model).append("。\n");
        }
        sb.append("\n下一步可以：1）追问细节 2）换技能重跑 3）转到对应工具页精调。");
        return sb.toString();
    }

    /** 前端模型名 → model_key。 */
    private String resolveModelKey(String model) {
        if (model == null || model.isBlank()) {
            return CHAT_MODEL_PREFIX + "default";
        }
        String key = model.trim().toLowerCase().replace(' ', '-');
        return CHAT_MODEL_PREFIX + key;
    }

    /** 可中断的睡眠 —— 中断时返回 false。 */
    private static boolean sleep(long ms) {
        try {
            Thread.sleep(ms);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** 可挂载技能列表 —— 来自 Catalog，与公开接口同源。 */
    public List<Map<String, Object>> skills() {
        return Catalog.AGENT_SKILLS;
    }
}
