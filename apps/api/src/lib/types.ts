import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";

import type { BASE_PATH } from "./constants";

export type JwtPayload = {
  sub: number;
  email: string;
  exp: number;
};

export type AppEnv = {
  Variables: {
    jwtPayload: JwtPayload;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppEnv, {}, typeof BASE_PATH>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;
