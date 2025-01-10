export { h2s, hs, hss};import { cinfo, cwarn, gcatch, rf, xpath, style } from "../basic.js";import http2 from "http2";import https from "https";import http from "http";import EventEmitter from "events";import { hd_stream } from "./gold.js";import { addr, _404 } from "./router.js";/** * hs定位:业务核心服务器,及h2测试服务器,生产环境中主要反代使用 * 安防交给nginx cf等网关 * @param  {...any} argv * @returns */function hs(...argv) {  let { port, config } = argv_port_config(argv),    server,    scheme,    protocol = "http/1.1",    currentConnections = 0;   if (config?.key) {    if (config.hasOwnProperty("allowHTTP1")) {      server = http2.createSecureServer(config);      if (config.allowHTTP1) protocol = "h2,http/1.1";      else protocol = "h2";    } else server = https.createServer(config);    scheme = "https";  } else {    server = http.createServer({ insecureHTTPParser: false });    scheme = "http";  }  server.listen(port, () => {    cinfo.bind({ info: 2 })(      `${style.reset}${style.bold}${style.brightGreen}✓ ${style.brightWhite}Running on ${style.underline}${scheme}://localhost:${port}${style.reset}`    );    gcatch();    if (config?.key) {      server.on("stream", (stream, headers) => {        stream.protocol = "h2";        hd_stream(server, stream, headers);      });    }  });  server.on("connection", (socket) => {    currentConnections++;     socket.on("close", () => {      currentConnections--;     });  });  server.on("request", (req, res) => {    if (req.headers[":path"]) return;    req.scheme = scheme;    let { stream, headers } = simulateHttp2Stream(req, res);    hd_stream(server, stream, headers);  });  server.on("error", (err) => {    if (err.code === "EADDRINUSE" && port < 65535) {      cwarn.bind({ info: 2 })(        `${style.bold}${style.yellow}⚠ ${style.dim}${          style.brightMagenta        }Port ${port} is in use, trying ${port + 1} instead...${style.reset}`      );      port++;      server.listen(port);    } else {      console.error(`Server error: ${err.message}`);    }  });  cinfo.bind({ info: 2 })(`Start [${protocol}] ${scheme} server...`);  server = Object.assign(server, {    http_local: true,    https_local: false,    routes: [],    addr,    _404,    router_begin: (server, gold) => {},    cnn: 0,  });  Object.defineProperties(server, {    routes: { writable: false, configurable: false },    addr: { writable: false, configurable: false },    cnn: {      get: () => currentConnections,      enumerable: true,    },  });  return server;}/** * h2s 默认创建 h2tls 兼容 http1.1 tls 的服务器,也可通过配置仅创建h2server * @param  {...any} argv * @returns */function h2s(...argv) {  let { port, config } = argv_port_config(argv);  config = {    ...{      key: rf(xpath("../../../store/cert/selfsigned.key", import.meta.url)),      cert: rf(xpath("../../../store/cert/selfsigned.cert", import.meta.url)),      allowHTTP1: true,    },    ...config,  };  return hs(port, config);}/** * hss 创建http1.1 tls server * @param  {...any} argv * @returns */function hss(...argv) {  let { port, config } = argv_port_config(argv);  config = {    ...{      key: rf(xpath("../../../store/cert/selfsigned.key", import.meta.url)),      cert: rf(xpath("../../../store/cert/selfsigned.cert", import.meta.url)),    },    config,  };  return hs(port, config);}/** * argv_port_config 动态分析argv返回端口和配置 * @param {*} argv * @returns */function argv_port_config(argv) {  let port, config;  argv.forEach((item) => {    if (typeof item === "object") {      config = item;    } else {      port = item;    }  });  port = port || 3000;  return { port, config };}function simulateHttp2Stream(req, res) {  const headers = { ...req.headers };  headers[":method"] = req.method;  headers[":path"] = req.url;  headers[":scheme"] = req.scheme;  headers[":authority"] = req.headers.host || "";  const stream = new EventEmitter();   stream.protocol = "HTTP/" + req.httpVersion;  stream.ip = req.socket.remoteAddress;  stream.respond = (responseHeaders) => {    const status = responseHeaders[":status"] || 200;     const filteredHeaders = Object.fromEntries(      Object.entries(responseHeaders).filter(([key]) => !key.startsWith(":"))    );    res.writeHead(status, filteredHeaders);  };  stream.write = res.write.bind(res);  stream.end = res.end.bind(res);  req.on("data", (chunk) => stream.emit("data", chunk));  req.on("end", () => stream.emit("end"));  req.on("error", (err) => stream.emit("error", err));  return { stream, headers };}