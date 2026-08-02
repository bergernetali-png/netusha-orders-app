"use strict";

function compile(pattern) {
  const keys = [];
  const regexStr = pattern
    .replace(/\/+$/, "")
    .split("/")
    .map(seg => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${regexStr}/?$`), keys };
}

class Router {
  constructor() {
    this.routes = [];
  }
  add(method, pattern, handler) {
    const { regex, keys } = compile(pattern);
    this.routes.push({ method, regex, keys, handler });
    return this;
  }
  get(p, h) { return this.add("GET", p, h); }
  post(p, h) { return this.add("POST", p, h); }
  put(p, h) { return this.add("PUT", p, h); }
  del(p, h) { return this.add("DELETE", p, h); }

  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.regex.exec(pathname);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { handler: r.handler, params };
      }
    }
    return null;
  }
}

module.exports = { Router };
