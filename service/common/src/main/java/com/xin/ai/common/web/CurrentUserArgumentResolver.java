package com.xin.ai.common.web;

import com.xin.ai.common.security.AuthContext;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * @CurrentUser 参数解析器：把 AuthContext.Principal 注入 Controller 方法参数。
 * 行内注释1：未登录时直接抛 401 业务异常，由 GlobalExceptionHandler 统一转错误体。
 */
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(com.xin.ai.common.security.CurrentUser.class)
                && AuthContext.Principal.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        return AuthContext.require();
    }
}
