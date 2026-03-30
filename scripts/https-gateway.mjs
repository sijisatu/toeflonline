#!/usr/bin/env node

// Local HTTPS helper for development/testing only.
// Production should serve dist/ via Nginx and proxy /api + /socket.io to the backend.

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import net from 'node:net';
import { extname, join, normalize } from 'node:path';
import { URL } from 'node:url';

const rootDir = new URL('..', import.meta.url).pathname;
const distDir = join(rootDir, 'dist');
const certDir = join(rootDir, 'certs');
const certPath = join(certDir, 'toefl-local-dev.pem');
const keyPath = join(certDir, 'toefl-local-dev-key.pem');
const backendHost = '127.0.0.1';
const backendPort = 4000;
const gatewayPort = Number(process.env.GATEWAY_PORT || 4443);

if (!existsSync(certPath) || !existsSync(keyPath)) {
  throw new Error(`Missing TLS certificate files in ${certDir}`);
}

if (!existsSync(distDir)) {
  throw new Error(`Missing built frontend in ${distDir}`);
}

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function pipeProxy(req, res) {
  const proxyReq = httpRequest(
    {
      host: backendHost,
      port: backendPort,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: `${backendHost}:${backendPort}`,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': req.headers.host || '',
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Gateway proxy error', detail: error.message }));
  });

  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  const incomingPath = new URL(req.url || '/', 'https://gateway.local').pathname;
  const candidate = incomingPath === '/' ? '/index.html' : incomingPath;
  const normalizedPath = normalize(candidate).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(distDir, normalizedPath);
  const fallbackPath = join(distDir, 'index.html');

  const selectedPath =
    existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallbackPath;
  const extension = extname(selectedPath).toLowerCase();
  res.writeHead(200, {
    'content-type': contentTypes.get(extension) || 'application/octet-stream',
  });
  createReadStream(selectedPath).pipe(res);
}

const server = createHttpsServer(
  {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
  },
  (req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
      pipeProxy(req, res);
      return;
    }

    serveStatic(req, res);
  },
);

server.on('upgrade', (req, socket, head) => {
  if (!req.url?.startsWith('/socket.io/')) {
    socket.destroy();
    return;
  }

  const upstream = net.connect(backendPort, backendHost, () => {
    const headers = [
      `${req.method} ${req.url} HTTP/${req.httpVersion}`,
      ...Object.entries(req.headers).map(([key, value]) => `${key}: ${value}`),
      'x-forwarded-proto: https',
      '',
      '',
    ].join('\r\n');

    upstream.write(headers);
    if (head?.length) {
      upstream.write(head);
    }
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(gatewayPort, '0.0.0.0', () => {
  console.log(`HTTPS gateway listening on https://0.0.0.0:${gatewayPort}`);
});
