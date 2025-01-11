export { req, h2req, h1req };
import http2 from "http2";
import https from "https";
import http from "http";
import { empty } from "../basic.js";
import { br_decompress, inflate, zstd_decompress, gunzip } from "../codec.js";
const h2session = new Map();
const options_keys = ["settings", "cert", "timeout", "json"];
const d_headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
};
const d_timeout = 8000;
function reqbuild(...argv) {
    try {
        let { h2session, urlobj, url, method, headers, body, options } = this || {};
        if (argv.length === 0) {
            if (empty(this))
                throw new Error("首次构建,至少传入url");
            else
                return this;
        }
        else {
            body = "";
        }
        if (typeof argv[0] === "object") {
            h2session = argv[0].h2session || h2session;
            method = argv[0].method || method;
            body = argv[0].body || body;
            headers = { ...headers, ...argv[0].headers };
            options = { ...options, ...argv[0].options };
            argv = [argv[0].url];
        }
        let new_headers, new_options;
        if (typeof argv[0] === "string") {
            const arr = argv[0].split(" ");
            if (arr[0].startsWith("http")) {
                url = arr[0];
                method = arr[1] || method || "GET";
            }
            else if (arr[0].startsWith("/")) {
                url = urlobj.origin + arr[0];
                method = arr[1] || method;
            }
            else if (arr[0].startsWith("?")) {
                url = urlobj.origin + urlobj.pathname + arr[0];
                method = arr[1] || method;
            }
            else {
                if (empty(this))
                    throw new Error("构造错误,请参考文档或示例");
                data = argv[0];
            }
            argv.slice(1).forEach((item) => {
                {
                    if (!body && typeof item === "string" && item !== "")
                        body = item;
                    else if (empty(item))
                        new_options = {};
                    else if (typeof item === "object") {
                        if (Object.keys(item).every((key) => options_keys.includes(key))) {
                            if (!new_options)
                                new_options = item;
                            else if (!new_headers)
                                new_headers = item;
                        }
                        else {
                            if (!new_headers)
                                new_headers = item;
                        }
                    }
                }
            });
        }
        method = method.toUpperCase();
        urlobj = new URL(url) || urlobj;
        headers = { ...headers, ...new_headers } || {};
        options = { ...options, ...new_options } || {};
        if (options) {
            if ("cert" in options) {
                options.rejectUnauthorized = options.cert;
                delete options.cert;
            }
            if ("json" in options) {
                headers["content-type"] = headers["content-type"] || "application/json";
                body = JSON.stringify(options.json);
                delete options.json;
            }
        }
        return {
            h2session,
            urlobj,
            url,
            method,
            body,
            headers,
            options,
        };
    }
    catch (err) {
        console.error(err);
    }
}
async function req(...argv) {
    const obj = reqbuild(...argv);
    try {
        if (obj.urlobj.protocol === "http:") {
            return h1req(obj);
        }
        const h2session = await h2connect(obj);
        if (h2session) {
            obj.h2session = h2session;
            return h2req(obj);
        }
        return h1req(obj);
    }
    catch (error) {
        if (error.code === "EPROTO" || error.code === "ECONNRESET") {
            if (obj.method.toUpperCase() === "CONNECT")
                return console.error("CONNECT method unsupperted");
            console.error(error.code, "maybe", obj.urlobj.protocol === "https:" ? "http" : "https");
        }
        else {
            console.error(error);
            return resbuild.bind(obj)(false);
        }
    }
}
async function h2connect(obj) {
    const { urlobj, options } = obj;
    const host = urlobj.host;
    if (h2session.has(host)) {
        const session = h2session.get(host);
        if (!session.destroyed && !session.closed) {
            console.dev("复用h2session", host);
            return session;
        }
        else {
            h2session.delete(host);
        }
    }
    return new Promise((resolve, reject) => {
        console.dev("创建h2session", host);
        const session = http2.connect(urlobj.origin, {
            ...{
                settings: { enablePush: false },
            },
            ...options,
        });
        session.once("connect", () => {
            h2session.set(host, session);
            return resolve(session);
        });
        function fn(err) {
            session.destroy();
            if (err.code.startsWith("ERR_SSL") || err.code === "ECONNRESET") {
                console.dev("server不支持h2,智能降级http/1.1");
                return resolve(false);
            }
            return reject(err);
        }
        session.once("error", fn.bind("error"));
    });
}
async function h2req(...argv) {
    const reqobj = reqbuild(...argv);
    let { h2session, urlobj, method, headers, body, options } = reqobj;
    console.dev("h2", urlobj.protocol, method, body);
    headers = {
        ...d_headers,
        ...headers,
        ...{
            ":path": urlobj.pathname + urlobj.search,
            ":method": method || "GET",
        },
    };
    let req;
    if (h2session)
        req = await h2session.request(headers);
    else {
        try {
            h2session = await h2connect(reqobj);
            if (h2session === false)
                throw new Error("H2 connect failed");
            req = await h2session.request(headers);
        }
        catch (error) {
            console.error(error);
            return resbuild.bind(reqobj)(false, "h2");
        }
    }
    return new Promise((resolve, reject) => {
        if (!empty(body))
            req.write(body);
        req.end();
        req.on("response", (headers, flags) => {
            const chunks = [];
            req.on("data", (chunk) => {
                chunks.push(chunk);
            });
            req.on("end", () => {
                clearTimeout(timeoutId);
                const body = Buffer.concat(chunks);
                headers = Object.keys(headers).reduce((obj, key) => {
                    obj[key] = headers[key];
                    return obj;
                }, {});
                const code = headers[":status"] || 200;
                delete headers[":status"];
                resolve(resbuild.bind(reqobj)(true, "h2", code, headers, body));
            });
        });
        const timeout = options.timeout || d_timeout;
        const timeoutId = setTimeout(() => {
            req.close();
            console.error(`H2 req timeout >${timeout}ms`);
            resolve(resbuild.bind(reqobj)(false, "h2", 408));
        }, timeout);
        req.on("error", (err) => {
            clearTimeout(timeoutId);
            console.error(err);
            resolve(resbuild.bind(reqobj)(false, "h2"));
        });
    });
}
const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
});
const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
});
async function h1req(...argv) {
    const reqobj = reqbuild(...argv);
    let { urlobj, method, body, headers, options } = reqobj;
    console.dev("h1", urlobj.protocol, method, body);
    const protocol = urlobj.protocol === "https:" ? https : http;
    const agent = urlobj.protocol === "https:" ? httpsAgent : httpAgent;
    const new_headers = {
        ...d_headers,
        ...headers,
    };
    options = {
        ...{
            protocol: urlobj.protocol,
            hostname: urlobj.hostname,
            port: urlobj.port || (urlobj.protocol === "https:" ? 443 : 80),
            path: urlobj.pathname + urlobj.search,
            method: method || "GET",
            headers: new_headers,
            agent,
            timeout: d_timeout,
        },
        ...options,
    };
    return new Promise((resolve, reject) => {
        const req = protocol.request(options, async (res) => {
            try {
                const chunks = [];
                for await (const chunk of res) {
                    chunks.push(chunk);
                }
                const body = Buffer.concat(chunks);
                resolve(resbuild.bind(reqobj)(true, "http/1.1", res.statusCode, res.headers, body));
            }
            catch (error) {
                console.error(error);
                resolve(resbuild.bind(reqobj)(false, "http/1.1"));
            }
        });
        req.on("error", (error) => {
            console.error(error);
            resolve(resbuild.bind(reqobj)(false, "http/1.1"));
        });
        req.on("timeout", () => {
            req.destroy(new Error(`HTTP/1.1 req timeout >${options.timeout}ms`));
            resolve(resbuild.bind(reqobj)(false, "http/1.1", 408));
        });
        req.on("socket", (socket) => {
            if (socket.connecting) {
                console.dev("新h1连接");
            }
            else {
                console.dev("复用h1连接");
            }
        });
        if (!empty(body))
            req.write(body);
        req.end();
    });
}
function body2data(body, ct) {
    let data;
    if (ct.startsWith("application/json")) {
        try {
            data = JSON.parse(body);
        }
        catch {
            data = {};
        }
    }
    else if (ct === "application/x-www-form-urlencoded") {
        data = {};
        const params = new URLSearchParams(body);
        for (const [key, value] of params) {
            data[key] = value;
        }
    }
    else if (ct?.startsWith("multipart/form-data")) {
        data = {};
        const boundaryMatch = ct.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
            throw new Error("Boundary not found in Content-Type");
        }
        const boundary = boundaryMatch[1];
        const parts = body.split(`--${boundary}`);
        for (let part of parts) {
            part = part.trim();
            if (!part || part === "--")
                continue;
            const [rawHeaders, ...rest] = part.split("\r\n\r\n");
            const content = rest.join("\r\n\r\n").replace(/\r\n$/, "");
            const headers = rawHeaders.split("\r\n");
            let name = null;
            let filename = null;
            let contentType = null;
            headers.forEach((header) => {
                const nameMatch = header.match(/name="([^"]+)"/);
                if (nameMatch) {
                    name = nameMatch[1];
                }
                const filenameMatch = header.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
                const ctMatch = header.match(/Content-Type:\s*(.+)/i);
                if (ctMatch) {
                    contentType = ctMatch[1];
                }
            });
            if (!name)
                continue;
            if (filename) {
                const fileObj = {
                    filename: filename,
                    content: content,
                    contentType: contentType || "application/octet-stream",
                };
                if (data[name]) {
                    if (Array.isArray(data[name])) {
                        data[name].push(fileObj);
                    }
                    else {
                        data[name] = [data[name], fileObj];
                    }
                }
                else {
                    data[name] = fileObj;
                }
            }
            else {
                if (data[name] !== undefined) {
                    if (Array.isArray(data[name])) {
                        data[name].push(content);
                    }
                    else {
                        data[name] = [data[name], content];
                    }
                }
                else {
                    data[name] = content;
                }
            }
        }
        for (const key in data) {
            if (Array.isArray(data[key]) && data[key].length === 1) {
                data[key] = data[key][0];
            }
        }
    }
    return data;
}
function setcookie(arr, str) {
    if (arr)
        return str || "" + arr.map((item) => item.split(";")[0]).join(";");
    else
        return str || "";
}
async function autoDecompressBody(body, ce) {
    if (!body)
        return "";
    try {
        if (ce === "br")
            body = await br_decompress(body);
        else if (ce === "deflate")
            body = await inflate(body);
        else if (ce === "zstd")
            body = await zstd_decompress(body);
        else if (ce === "gzip")
            body = await gunzip(body);
    }
    catch (err) {
        console.error("返回数据解压失败", err);
    }
    return body.toString();
}
async function resbuild(ok, protocol, code, headers, body) {
    const reqobj = this;
    let cookie, data;
    cookie = setcookie(headers?.["set-cookie"], reqobj.headers.cookie);
    if (ok) {
        body = await autoDecompressBody(body, headers["content-encoding"]);
        data = headers["content-type"]
            ? body2data(body, headers["content-type"])
            : {};
    }
    const res = {
        ok,
        code,
        headers,
        cookie,
        body,
        data,
        protocol,
        req: async (...argv) => {
            reqobj.headers.cookie = cookie;
            return req(reqbuild.bind(reqobj)(...argv));
        },
        reqobj,
        reset: null,
        reset_org: null,
        reset_hds: null,
        reset_ops: null,
    };
    return Object.defineProperties(res, {
        h2session: { enumerable: false, writable: false, configurable: false },
        req: { enumerable: false, writable: false, configurable: false },
        reqobj: { enumerable: false, writable: false, configurable: false },
        reset: { enumerable: false, writable: false, configurable: false },
        reset_org: { enumerable: false, writable: false, configurable: false },
        reset_hds: { enumerable: false, writable: false, configurable: false },
        reset_ops: { enumerable: false, writable: false, configurable: false },
    });
}
