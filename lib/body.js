"use strict";
// קריאת גוף הבקשה: JSON, application/x-www-form-urlencoded, ו-multipart/form-data
const querystring = require("querystring");

function readRawBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  const boundary = match ? (match[1] || match[2]) : null;
  const fields = {};
  const files = {};
  if (!boundary) return { fields, files };
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBuf);
  while (start !== -1) {
    const next = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
    if (next === -1) break;
    let chunk = buffer.slice(start + boundaryBuf.length, next);
    if (chunk.slice(0, 2).toString() === "\r\n") chunk = chunk.slice(2);
    if (chunk.slice(-2).toString() === "\r\n") chunk = chunk.slice(0, -2);
    parts.push(chunk);
    start = next;
  }
  for (const part of parts) {
    if (part.length === 0) continue;
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const rawHeaders = part.slice(0, headerEnd).toString("utf8");
    const body = part.slice(headerEnd + 4);
    const nameMatch = /name="([^"]+)"/i.exec(rawHeaders);
    const filenameMatch = /filename="([^"]*)"/i.exec(rawHeaders);
    const ctMatch = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    if (filenameMatch && filenameMatch[1] !== "") {
      var fileEntry = {
        filename: filenameMatch[1],
        contentType: ctMatch ? ctMatch[1].trim() : "application/octet-stream",
        data: body,
      };
      if (files[fieldName] === undefined) files[fieldName] = fileEntry;
      else if (Array.isArray(files[fieldName])) files[fieldName].push(fileEntry);
      else files[fieldName] = [files[fieldName], fileEntry];
    } else if (filenameMatch && filenameMatch[1] === "") {
      // input קובץ ריק — מתעלמים
    } else {
      var val = body.toString("utf8");
      if (fields[fieldName] === undefined) fields[fieldName] = val;
      else if (Array.isArray(fields[fieldName])) fields[fieldName].push(val);
      else fields[fieldName] = [fields[fieldName], val];
    }
  }
  return { fields, files };
}

async function parseBody(req) {
  const contentType = req.headers["content-type"] || "";
  const raw = await readRawBody(req);
  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(raw, contentType);
  }
  if (contentType.includes("application/json")) {
    try { return { fields: JSON.parse(raw.toString("utf8") || "{}"), files: {} }; }
    catch (e) { return { fields: {}, files: {} }; }
  }
  const fields = querystring.parse(raw.toString("utf8"));
  return { fields, files: {} };
}

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

module.exports = { parseBody, readRawBody, parseMultipart, toArray };
