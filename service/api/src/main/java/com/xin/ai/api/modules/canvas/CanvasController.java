package com.xin.ai.api.modules.canvas;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.CanvasService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 画布接口（文档 §2.7）。
 * 行内注释1：PUT graph 带 version，版本不匹配返回 409 canvas.version_conflict。
 */
@RestController
@RequestMapping("/api/v1/canvases")
public class CanvasController extends BaseController {

    private final CanvasService canvases;

    public CanvasController(CanvasService canvases) {
        this.canvases = canvases;
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@CurrentUser AuthContext.Principal user) {
        return list(canvases.list(user.userId()));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(@CurrentUser AuthContext.Principal user,
            @RequestBody(required = false) CreateCanvasRequest req) {
        return ok(canvases.create(user.userId(), req == null ? null : req.title()));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(canvases.get(user.userId(), id));
    }

    @PatchMapping("/{id}")
    public ApiResponse<Map<String, Object>> rename(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody RenameRequest req) {
        return ok(canvases.rename(user.userId(), id, req.title()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        canvases.delete(user.userId(), id);
        return ok();
    }

    /** 整图存取。 */
    @PutMapping("/{id}/graph")
    public ApiResponse<Map<String, Object>> saveGraph(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @RequestBody SaveGraphRequest req) {
        return ok(canvases.saveGraph(user.userId(), id, req.nodes(), req.edges(), req.version()));
    }

    @GetMapping("/{id}/versions")
    public ApiResponse<List<Map<String, Object>>> versions(@CurrentUser AuthContext.Principal user,
            @PathVariable String id) {
        return list(canvases.versions(user.userId(), id));
    }

    @PostMapping("/{id}/versions/{version}/restore")
    public ApiResponse<Map<String, Object>> restore(@CurrentUser AuthContext.Principal user, @PathVariable String id,
            @PathVariable String version) {
        return ok(canvases.restore(user.userId(), id, version));
    }

    /** 生成分享链接。 */
    @PostMapping("/{id}/share")
    public ApiResponse<Map<String, Object>> share(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        return ok(canvases.share(user.userId(), id));
    }

    /** 画布模板（公开）。 */
    @GetMapping("/templates")
    public ApiResponse<List<Map<String, Object>>> templates() {
        return list(canvases.templates());
    }

    // ---------------- 请求体 ----------------

    public record CreateCanvasRequest(String title) {}

    public record RenameRequest(String title) {}

    public record SaveGraphRequest(List<Object> nodes, List<Object> edges, Integer version) {}
}
