/**
 * API 响应工具函数
 */

// 错误码定义
export const ErrorCodes = {
  // 通用错误 1xxx
  PARAM_ERROR: 1001,
  NOT_FOUND: 1002,
  UNAUTHORIZED: 1003,
  FORBIDDEN: 1004,
  PERMISSION_DENIED: 1005,
  VALIDATION_ERROR: 1006,
  INTERNAL_ERROR: 1007,
  RECHARGE_ERROR: 1008,

  // 认证错误 2xxx
  USER_NOT_FOUND: 2001,
  INVALID_CREDENTIALS: 2002,
  TOKEN_INVALID: 2003,
  USER_EXISTS: 2004,

  // 资源错误 3xxx
  VENUE_NOT_FOUND: 3001,
  EQUIPMENT_NOT_FOUND: 3002,
  ORDER_NOT_FOUND: 3003,

  // 业务错误 4xxx
  INSUFFICIENT_BALANCE: 4001,
  ORDER_STATUS_ERROR: 4002,
  CANNOT_PARTIAL_EXIT: 4003,
};

// 响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  details?: Record<string, unknown>;
}

/**
 * 成功响应
 */
export function success<T>(data?: T, message = 'success'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  };
}

/**
 * 错误响应
 */
export function error(
  code: number,
  message: string,
  details?: Record<string, unknown>
): ApiResponse {
  return {
    code,
    message,
    details,
  };
}

/**
 * 参数错误
 */
export function paramError(message = '参数错误'): ApiResponse {
  return error(ErrorCodes.PARAM_ERROR, message);
}

/**
 * 未授权
 */
export function unauthorized(message = '未授权'): ApiResponse {
  return error(ErrorCodes.UNAUTHORIZED, message);
}

/**
 * 禁止访问
 */
export function forbidden(message = '禁止访问'): ApiResponse {
  return error(ErrorCodes.FORBIDDEN, message);
}

/**
 * 资源不存在
 */
export function notFound(message = '资源不存在'): ApiResponse {
  return error(ErrorCodes.NOT_FOUND, message);
}

/**
 * 内部错误
 */
export function internalError(message = '内部错误'): ApiResponse {
  return error(ErrorCodes.INTERNAL_ERROR, message);
}
