package com.xin.ai.common.exception;

import com.xin.ai.common.dto.ApiResponse;
import com.xin.ai.common.dto.ErrorResponse;
import com.xin.ai.common.dto.PageResult;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 全局异常处理：BizException → 业务错误体，其余 → 兜底 500。
 * 行内注释1：错误体形状 {error:{code,message,details,trace_id}}，前端 api.ts 直接读 payload.error。
 * 行内注释2：参数校验异常转 common.bad_request，details 带字段名，便于前端定位。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 行内注释3：业务异常分支 —— 状态码来自 ErrorCode，避免 controller 各自写。
    @ExceptionHandler(BizException.class)
    public ResponseEntity<ErrorResponse> handleBiz(BizException e) {
        ErrorCode code = e.getErrorCode();
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                code.code(), e.getMessage(), e.getDetails(), MDC.get("traceId"));
        return ResponseEntity.status(code.httpStatus()).body(new ErrorResponse(body));
    }

    // 行内注释4：参数校验分支 —— 收集字段错误，前端可按字段高亮。
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        Map<String, Object> details = e.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() == null ? "参数不合法" : fe.getDefaultMessage(),
                        (a, b) -> a));
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_BAD_REQUEST.code(),
                ErrorCode.COMMON_BAD_REQUEST.message(),
                details,
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_BAD_REQUEST.httpStatus())
                .body(new ErrorResponse(body));
    }

    // 行内注释4.1：请求体解析失败（JSON 语法错 / 类型不匹配）——
    //             这是客户端的参数问题，必须回 400 而不是掉进兜底 500。
    //             否则前端只会看到「服务器内部错误」，用户不知道怎么改。
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException e) {
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_BAD_REQUEST.code(),
                "请求体格式不正确",
                Map.of("message", "请求体格式不正确"),
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_BAD_REQUEST.httpStatus())
                .body(new ErrorResponse(body));
    }

    // 行内注释4.4：路由层异常（路径不存在 / 方法不支持）——
    //             这类是「客户端打错了地址」，必须回 404 / 405，
    //             不能掉进兜底 500 —— 否则前端 api.ts 会把它当成「服务端故障」，
    //             用户看到的是「服务繁忙」这种毫无指向性的提示，
    //             而真实原因是「这个接口不存在 / 该接口不支持 PUT」。
    //             实测：PUT /api/v1/points/balance 之前回 500，
    //             排查时完全看不出是路由不匹配。
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_METHOD_NOT_ALLOWED.code(),
                ErrorCode.COMMON_METHOD_NOT_ALLOWED.message(),
                Map.of("method", e.getMethod() == null ? "" : e.getMethod()),
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_METHOD_NOT_ALLOWED.httpStatus())
                .body(new ErrorResponse(body));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleMappingNotFound(NoHandlerFoundException e) {
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_NOT_FOUND.code(),
                ErrorCode.COMMON_NOT_FOUND.message(),
                Map.of(),
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_NOT_FOUND.httpStatus())
                .body(new ErrorResponse(body));
    }

    // 行内注释4.5：静态资源未命中（Spring Boot 3.2+）——
    //             同样是「地址不存在」，回 404 而不是 500。
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException e) {
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_NOT_FOUND.code(),
                ErrorCode.COMMON_NOT_FOUND.message(),
                Map.of(),
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_NOT_FOUND.httpStatus())
                .body(new ErrorResponse(body));
    }

    // 行内注释5：兜底分支 —— 未知异常统一转 internal，不泄露堆栈。
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnknown(Exception e) {
        // 行内注释6：兜底也记日志 —— 否则线上只能看到 500 而看不到原因。
        org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class)
                .error("unhandled exception", e);
        ErrorResponse.ErrorBody body = new ErrorResponse.ErrorBody(
                ErrorCode.COMMON_INTERNAL.code(),
                ErrorCode.COMMON_INTERNAL.message(),
                Map.of(),
                MDC.get("traceId"));
        return ResponseEntity.status(ErrorCode.COMMON_INTERNAL.httpStatus())
                .body(new ErrorResponse(body));
    }
}
