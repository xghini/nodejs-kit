export * from "./routes.js";
export function h2s(...argv: any[]): (http2.Http2SecureServer<typeof http.IncomingMessage, typeof http.ServerResponse, typeof http2.Http2ServerRequest, typeof http2.Http2ServerResponse> | https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) & {
    http_local: boolean;
    https_local: boolean;
    routes: any[];
    addr: typeof addr;
    _404: typeof _404;
    router_begin: (server: any, gold: any) => void;
    cnn: number;
};
export function hs(...argv: any[]): (http2.Http2SecureServer<typeof http.IncomingMessage, typeof http.ServerResponse, typeof http2.Http2ServerRequest, typeof http2.Http2ServerResponse> | https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) & {
    http_local: boolean;
    https_local: boolean;
    routes: any[];
    addr: typeof addr;
    _404: typeof _404;
    router_begin: (server: any, gold: any) => void;
    cnn: number;
};
export function hss(...argv: any[]): (http2.Http2SecureServer<typeof http.IncomingMessage, typeof http.ServerResponse, typeof http2.Http2ServerRequest, typeof http2.Http2ServerResponse> | https.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) & {
    http_local: boolean;
    https_local: boolean;
    routes: any[];
    addr: typeof addr;
    _404: typeof _404;
    router_begin: (server: any, gold: any) => void;
    cnn: number;
};
export function req(url: any, method?: string, postData?: any): Promise<any>;
import http from "http";
import http2 from "http2";
import https from "https";
import { addr } from "./router.js";
import { _404 } from "./router.js";
