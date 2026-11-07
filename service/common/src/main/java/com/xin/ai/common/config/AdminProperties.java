package com.xin.ai.common.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 后台管理员配置。
 * 行内注释1：管理员身份由「手机号白名单 + 角色白名单」两个维度共同决定 ——
 *             白名单手机号在注册/登录时自动落 ADMIN 角色（种子账号用），
 *             角色白名单决定哪些角色能访问 /api/v1/admin/**（默认 ADMIN + OPERATOR）。
 * 行内注释2：手机号白名单走环境变量 XIN_ADMIN_PHONES（逗号分隔），生产必须覆盖；
 *             默认留空 —— 留空时不会凭空造管理员，只有你在后台手工改角色才能进。
 */
@ConfigurationProperties(prefix = "xin.admin")
public class AdminProperties {

    /** 种子管理员手机号白名单（逗号分隔的环境变量注入）。 */
    private String phones = "";
    /** 可访问后台的角色白名单。 */
    private List<String> roles = new ArrayList<>(List.of("ADMIN", "OPERATOR"));

    public String getPhones() { return phones; }
    public void setPhones(String v) { this.phones = v == null ? "" : v; }
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> v) { this.roles = v == null || v.isEmpty() ? List.of("ADMIN") : v; }

    /** 手机号是否在种子白名单里。 */
    public boolean isSeedPhone(String phone) {
        if (phone == null || phone.isBlank() || phones == null || phones.isBlank()) {
            return false;
        }
        String normalized = phone.replaceAll("\\s", "");
        for (String p : phones.split(",")) {
            if (!p.isBlank() && p.trim().replaceAll("\\s", "").equals(normalized)) {
                return true;
            }
        }
        return false;
    }

    /** 角色是否允许访问后台。 */
    public boolean isAdminRole(String role) {
        if (role == null) {
            return false;
        }
        return roles.stream().anyMatch(r -> r != null && r.equalsIgnoreCase(role));
    }
}
