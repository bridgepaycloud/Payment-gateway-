// main.ts — Deno Deploy entry point
// Replaces _redirects (which Deno Deploy does not support).
// Set this file as your Entry Point in Deno Deploy project settings.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

// Clean URL → real HTML file (mirrors your old _redirects file)
const ROUTES: Record<string, string> = {
  "/":                     "/index.html",
  "/index":                "/index.html",
  "/auth":                 "/auth.html",
  "/login":                "/auth.html",
  "/register":             "/auth.html",
  "/sign-in":              "/auth.html",
  "/sign-up":              "/auth.html",
  "/dashboard":            "/dashboard.html",
  "/my-account/dashboard": "/dashboard.html",
  "/docs":                 "/docs.html",
  "/documentation":        "/docs.html",
  "/about":                "/about.html",
  "/terms":                "/terms.html",
  "/privacy":              "/privacy.html",
  "/blog":                 "/blog.html",
  "/sandbox":              "/sandbox.html",
  "/sandbox-tester":       "/sandbox.html",
  "/sdks":                 "/sdks.html",
  "/libraries":            "/sdks.html",
};

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  // Normalise: strip trailing slash unless it's just "/"
  const pathname = url.pathname.length > 1
    ? url.pathname.replace(/\/$/, "")
    : url.pathname;

  // 1. Try clean-URL mapping first — preserve query string on the rewrite
  const target = ROUTES[pathname] ?? null;
  if (target) {
    const rewrittenUrl = new URL(target, req.url);
    // Copy over any query parameters from the original request
    url.searchParams.forEach((v, k) => rewrittenUrl.searchParams.set(k, v));
    const rewritten = new Request(rewrittenUrl.href, req);
    const resp = await serveDir(rewritten, { fsRoot: ".", quiet: true });
    if (resp.status !== 404) return resp;
  }

  // 2. Serve static assets as-is (images, JS, CSS, fonts, etc.)
  const staticResp = await serveDir(req, { fsRoot: ".", quiet: true });
  if (staticResp.status !== 404) return staticResp;

  // 3. 404 fallback
  try {
    const notFound = await serveDir(
      new Request(new URL("/404.html", req.url).href, req),
      { fsRoot: ".", quiet: true },
    );
    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers,
    });
  } catch {
    return new Response("404 Not Found", { status: 404 });
  }
});
