import { PassThrough } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import { createReadableStreamFromReadable } from '@react-router/node';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';

const streamTimeout = 5_000;
let cachedConfig;

function readConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    cachedConfig = JSON.parse(fs.readFileSync('./eventstore.config.json').toString());
  } catch {
    cachedConfig = {};
  }

  return cachedConfig;
}

function safeCompare(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function getBasicAuthCredentials() {
  const basicAuth = readConfig().basicAuth;
  if (!basicAuth || typeof basicAuth !== 'object') return null;

  const username = typeof basicAuth.username === 'string' ? basicAuth.username : '';
  const password = typeof basicAuth.password === 'string' ? basicAuth.password : '';
  if (!username || !password) return null;

  return { username, password };
}

function isAuthorized(request, credentials) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(authorization.slice(6).trim(), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return (
    safeCompare(username, credentials.username) &&
    safeCompare(password, credentials.password)
  );
}

function unauthorizedResponse() {
  return new Response('Authentication required', {
    status: 401,
    headers: new Headers({
      'WWW-Authenticate': 'Basic realm="event-storage-ui"',
      'Content-Type': 'text/plain; charset=utf-8',
    }),
  });
}

export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  routerContext
) {
  const basicAuthCredentials = getBasicAuthCredentials();
  if (basicAuthCredentials && !isAuthorized(request, basicAuthCredentials)) {
    return unauthorizedResponse();
  }

  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get('user-agent');

    const readyOption =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? 'onAllReady'
        : 'onShellReady';

    let timeoutId = setTimeout(() => abort(), streamTimeout + 1000);

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );
  });
}
