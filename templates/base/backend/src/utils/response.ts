import type { ApiErrorResponse, ApiSuccessResponse } from "shared/types";

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data
  };
}

export function errorResponse(code: string, message: string): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message
    }
  };
}
