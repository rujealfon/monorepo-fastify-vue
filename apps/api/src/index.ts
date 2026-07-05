import { serve } from "@hono/node-server";
import app from "./app";

import { config } from "./config";
import "dotenv/config";

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${info.port}`);
});
