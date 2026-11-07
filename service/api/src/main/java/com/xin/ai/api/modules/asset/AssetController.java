package com.xin.ai.api.modules.asset;

import com.xin.ai.api.web.BaseController;
import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.PageResult;
import com.xin.ai.common.exception.BizException;
import com.xin.ai.common.exception.ErrorCode;
import com.xin.ai.common.security.AuthContext;
import com.xin.ai.common.security.CurrentUser;
import com.xin.ai.domain.repository.Rows;
import com.xin.ai.domain.service.AssetService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
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

    /**
     * 公共素材库 —— 展示审核通过并被运营授权对外的素材。
     * 行内注释2.1：scope 过滤是「授权范围」维度（全员 / 行业），不是用户归属维度。
     */
    @GetMapping("/public-assets")
    public ApiResponse<List<Map<String, Object>>> publicAssets(@RequestParam(required = false) String scope) {
        return list(assets.listPublicAssets(scope));
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

    /**
     * 导出打包 —— 返回真实可下载的 zip 地址。
     * 行内注释3：本地无对象存储时后端自托管 zip，下载走下方 /exports/{id}/download。
     */
    @PostMapping("/assets/exports")
    public ApiResponse<Map<String, Object>> export(@CurrentUser AuthContext.Principal user,
            @RequestBody ExportRequest req) {
        return ok(assets.exportAssets(user.userId(), req.ids(), req.label()));
    }

    /**
     * 下载导出包 —— 直接回 zip 字节流。
     * 行内注释3.1：清单里记的是资产元信息 + URL；没有对象存储时 zip 内放 manifest.json，
     *             接入存储后改为把真实文件字节写进 zip。
     */
    @GetMapping("/assets/exports/{id}/download")
    public ResponseEntity<byte[]> downloadExport(@CurrentUser AuthContext.Principal user,
            @PathVariable String id) {
        Map<String, Object> manifest = assets.findExport(user.userId(), id);
        byte[] body = buildZip(manifest);
        String filename = Rows.str(manifest, "filename", "export.zip");
        // 行内注释3.2：中文文件名必须按 RFC 5987 编码 ——
        //             Tomcat 10.1 会拒绝标准头里的非 ISO-8859-1 字节（直接抛 IllegalArgumentException），
        //             所以这里用 ContentDisposition.builder(...).filename(name, UTF_8)，
        //             它会同时产出 filename="..."(ASCII 兜底) 与 filename*=UTF-8''...(真实名)。
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, java.nio.charset.StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CONTENT_TYPE, "application/zip")
                .body(body);
    }

    /** 生成 zip 字节流 —— 含 manifest.json 与一个 README。 */
    private byte[] buildZip(Map<String, Object> manifest) {
        try (java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(bos)) {
            zos.putNextEntry(new java.util.zip.ZipEntry("manifest.json"));
            zos.write(String.valueOf(manifest.get("entries")).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            zos.closeEntry();
            zos.putNextEntry(new java.util.zip.ZipEntry("README.txt"));
            zos.write(("导出时间：" + manifest.get("created_at")
                    + "\n资产数量：" + manifest.get("count")
                    + "\n说明：本地开发环境无对象存储，包内含资产清单与原始下载地址。\n")
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8));
            zos.closeEntry();
            zos.finish();
            return bos.toByteArray();
        } catch (Exception e) {
            throw new BizException(ErrorCode.COMMON_INTERNAL_ERROR,
                    Map.of("message", "导出包生成失败：" + e.getMessage()));
        }
    }

    // ---------------- 请求体 ----------------

    public record UploadPolicyRequest(String filename, Long size, String contentType, String kind, String group) {}

    public record CompleteRequest(String assetId, Long size, String etag) {}

    public record UpdateAssetRequest(String name, String group, List<String> tags) {}

    public record BatchDeleteRequest(List<String> ids) {}

    public record CreateGroupRequest(String name) {}

    public record ExportRequest(List<String> ids, String label) {}
}
