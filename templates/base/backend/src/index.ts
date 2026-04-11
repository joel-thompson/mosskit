import { app } from "./app";
import { getBackendEnv } from "./utils/env";

const env = getBackendEnv();

export default {
  port: env.PORT,
  fetch: app.fetch
};
