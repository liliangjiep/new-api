package com.xin.ai.adapters.adapters;

import com.xin.ai.adapters.base.ModelAdapter;
import java.util.Map;

/**
 * M3-02 RelayAdapter：OpenAI 兼容中转站适配器。
 * 行内注释1：base_url/apiKey/upstreamModel 全从 request.endpoint() 取，构造器不持任何 URL。
 * 行内注释2：错误归一化 —— 429→限流，5xx→可重试，4xx→参数错误不重试。
 * TODO(API): OkHttp 接入后实现真实 HTTP 调用，当前返回占位。
 */
public class RelayAdapter implements ModelAdapter {

    @Override
    public String capability() {
        return "relay";
    }

    @Override
    public ModelResponse submit(ModelRequest req) {
        // 行内注释3：占位 —— 返回 upstreamTaskId，联调时替换为真实 POST {base}/v1/jobs。
        return new ModelResponse(true, "relay_mock_" + System.currentTimeMillis(),
                Map.of("endpoint", req.endpoint().baseUrl()), null, null);
    }
}
