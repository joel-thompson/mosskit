export type ApiError = {
  code: string;
  message: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type HealthPayload = {
  status: "ok";
  service: "backend";
  timestamp: string;
};

export type ExampleStatus = {
  message: string;
  database: {
    configured: boolean;
    connected: boolean;
  };
};

export type ProtectedUser = {
  userId: string;
};
