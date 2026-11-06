package com.xin.ai.api.modules.discover;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.DiscoverService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 发现内容流接口（文档 §2.5）。
 * 行内注释1：游标分页，前端只做透传；next_cursor 为 null 表示到底。
 */
@RestController
@RequestMapping("/api/v1/discover")
public class DiscoverController extends BaseController {

    private final DiscoverService discover;

    public DiscoverController(DiscoverService discover) {
        this.discover = discover;
    }

    @GetMapping("/feed")
    public ApiResponse<Map<String, Object>> feed(@RequestParam(required = false) String filter,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return ok(discover.feed(filter, query, cursor, limit));
    }

    /** 详情 —— 含 params_snapshot 供一键复用。 */
    @GetMapping("/items/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String id) {
        return ok(discover.detail(id));
    }

    /** 发布作品到发现流。 */
    @PostMapping("/items")
    public ApiResponse<Map<String, Object>> publish(@CurrentUser AuthContext.Principal user,
            @RequestBody PublishRequest req) {
        return ok(discover.publish(user.userId(), req.title(), req.coverUrl(), req.capability(),
                req.points() == null ? 0 : req.points(), req.tags(), req.toolHref(), req.paramsSnapshot()));
    }

    @PostMapping("/items/{id}/like")
    public ApiResponse<Void> like(@PathVariable String id) {
        discover.like(id);
        return ok();
    }

    public record PublishRequest(String title, String coverUrl, String capability, Integer points,
            java.util.List<String> tags, String toolHref, Map<String, Object> paramsSnapshot) {}
}
