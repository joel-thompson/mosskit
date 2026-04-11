import { app } from "../app";

test("health route returns ok", async () => {
  const response = await app.request("http://localhost/health");
  const payload = (await response.json()) as {
    status: string;
    service: string;
  };

  expect(response.status).toBe(200);
  expect(payload.status).toBe("ok");
  expect(payload.service).toBe("backend");
});
