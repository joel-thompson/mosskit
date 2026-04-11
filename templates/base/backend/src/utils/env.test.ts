import { getBackendEnv } from "./env";

test("getBackendEnv applies defaults", () => {
  expect(getBackendEnv({})).toMatchObject({
    PORT: 3000,
    FRONTEND_URL: "http://localhost:5173"
  });
});
