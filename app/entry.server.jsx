import { ServerRouter } from 'react-router';
import { renderToString } from 'react-dom/server';

export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  routerContext
) {
  const markup = renderToString(
    <ServerRouter context={routerContext} url={request.url} />
  );

  responseHeaders.set('Content-Type', 'text/html');

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders
  });
}
