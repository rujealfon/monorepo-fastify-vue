import type { AppOpenAPI } from "./types";

import packageJSON from "../../package.json";

export default function configureOpenAPI(app: AppOpenAPI) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer Token", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Tech Full Stack API",
    },
  });
}
