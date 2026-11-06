package com.xin.ai.api.modules.asset;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.service.AssetService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 资产接口（文档 §2.4）。
 * 行内注释1：两段式直传 —— upload-policy 拿凭证，complete 回填 size/etag 后资产才可见。
 * 行内注释2：筛选维度为 kind × source，对应前端 AssetPickerModal。
 */
@RestController
@RequestMapping("/api/v1")
public class AssetController extends BaseController {

    private final AssetService assets;

    public AssetController(AssetService assets) {
        this.assets = assets;
    }

    /** 资产列表。 */
    @GetMapping("/assets")
    public ApiResponse<PageResult<Map<String, Object>>> list(@CurrentUser AuthContext.Principal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int pageSize,
            @RequestParam(required = false) String kind,
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String query) {
        int size = Math.min(Math.max(pageSize, 1), 100);
        int p = Math.max(page, 1);
        List<Map<String, Object>> items = assets.list(user.userId(), kind, group, source, query, p, size);
        long total = assets.count(user.userId(), kind, group, source, query);
        return page(items, p, size, total);
    }

    /** 申请直传凭证。 */
    @PostMapping("/assets/upload-policy")
    public ApiResponse<Map<String, Object>> uploadPolicy(@CurrentUser AuthContext.Principal user,
            @RequestBody UploadPolicyRequest req) {
        return ok(assets.uploadPolicy(user.userId(), req.filename(), req.size(),
                req.contentType(), req.kind(), req.group()));
    }

    /** 确认上传完成。 */
    @PostMapping("/assets/complete")
    public ApiResponse<Map<String, Object>> complete(@CurrentUser AuthContext.Principal user,
            @RequestBody CompleteRequest req) {
        return ok(assets.complete(user.userId(), req.assetId(), req.size(), req.etag()));
    }

    /** 改名 / 换组 / 打标签。 */
    @PatchMapping("/assets/{id}")
    public ApiResponse<Map<String, Object>> update(@CurrentUser AuthContext.Principal user,
            @PathVariable String id, @RequestBody UpdateAssetRequest req) {
        return ok(assets.update(user.userId(), id, req.name(), req.group(), req.tags()));
    }

    @DeleteMapping("/assets/{id}")
    public ApiResponse<Void> delete(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        assets.delete(user.userId(), id);
        return ok();
    }

    /** 批量删除。 */
    @PostMapping("/assets/batch-delete")
    public ApiResponse<Map<String, Object>> batchDelete(@CurrentUser AuthContext.Principal user,
            @RequestBody BatchDeleteRequest req) {
        int n = assets.batchDelete(user.userId(), req.ids());
        return ok(Map.of("deleted", n));
    }

    /** 分组列表。 */
    @GetMapping("/asset-groups")
    public ApiResponse<List<Map<String, Object>>> groups(@CurrentUser AuthContext.Principal user) {
        return list(assets.listGroups(user.userId()));
    }

    /** 新建分组。 */
    @PostMapping("/asset-groups")
    public ApiResponse<Map<String, Object>> createGroup(@CurrentUser AuthContext.Principal user,
            @RequestBody CreateGroupRequest req) {
        return ok(assets.createGroup(user.userId(), req.name()));
    }

    @DeleteMapping("/asset-groups/{id}")
    public ApiResponse<Void> deleteGroup(@CurrentUser AuthContext.Principal user, @PathVariable String id) {
        assets.deleteGroup(user.userId(), id);
        return ok();
    }

    // ---------------- 请求体 ----------------

    public record UploadPolicyRequest(String filename, Long size, String contentType, String kind, String group) {}

    public record CompleteRequest(String assetId, Long size, String etag) {}

    public record UpdateAssetRequest(String name, String group, List<String> tags) {}

    public record BatchDeleteRequest(List<String> ids) {}

    public record CreateGroupRequest(String name) {}
}
