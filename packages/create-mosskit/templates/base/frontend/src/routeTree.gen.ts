/* eslint-disable */
// @ts-nocheck

import { Route as rootRouteImport } from "./routes/__root";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as SignInRouteImport } from "./routes/sign-in";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport
} as any);

const SignInRoute = SignInRouteImport.update({
  id: "/sign-in",
  path: "/sign-in",
  getParentRoute: () => rootRouteImport
} as any);

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute;
  "/sign-in": typeof SignInRoute;
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute;
  "/sign-in": typeof SignInRoute;
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport;
  "/": typeof IndexRoute;
  "/sign-in": typeof SignInRoute;
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths: "/" | "/sign-in";
  fileRoutesByTo: FileRoutesByTo;
  to: "/" | "/sign-in";
  id: "__root__" | "/" | "/sign-in";
  fileRoutesById: FileRoutesById;
}

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexRouteImport;
      parentRoute: typeof rootRouteImport;
    };
    "/sign-in": {
      id: "/sign-in";
      path: "/sign-in";
      fullPath: "/sign-in";
      preLoaderRoute: typeof SignInRouteImport;
      parentRoute: typeof rootRouteImport;
    };
  }
}

export const routeTree = rootRouteImport.addChildren([IndexRoute, SignInRoute]);
