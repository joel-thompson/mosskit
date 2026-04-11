import {
  API_ROUTES,
  type ApiResponse,
  type ExampleStatus,
  exampleStatusResponseSchema
} from "shared";
import { getFrontendEnv } from "./env";

type FetchOptions = RequestInit;

export async function fetchJson<T>(
  path: string,
  schema: { parse: (value: unknown) => { success: true; data: T } },
  options?: FetchOptions
) {
  const response = await fetch(`${getFrontendEnv().VITE_API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return schema.parse(payload).data;
}

export function fetchExampleStatus() {
  return fetchJson<ExampleStatus>(API_ROUTES.exampleStatus, exampleStatusResponseSchema);
}
