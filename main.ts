// main.ts — Deno Deploy entry point for NexaPay static site
// Handles clean URL routing so /about → about.html, /auth → auth.html, etc.
// Deploy this file as the entry point in Deno Deploy.

import { serveDir, serveFile } from "https://deno.land/std@0.224.0/http/file_server.ts";

const ROUTES: Record<string, string> = {
  "/":                        "index.html",
  "/index":                   "index.html",
  "/about":                   "about.html",
  "/auth":                    "auth.html",
  "/login":                   "auth.html",
  "/register":                "auth.html",
  "/sign-in":                 "auth.html",
  "/sign-up":                 "auth.html",
  "/terms":                   "terms.html",
  "/privacy":                 "privacy.html",
  "/blog":                    "blog.html",
  "/docs":                    "docs.html",
  "/documentation":           "docs.html",
  "/sandbox":                 "sandbox.html",
  "/sandbox-tester":          "sandbox.html",
  "/sdks":                    "sdks.html",
  "/libraries":               "sdks.html",
  "/dashboard":               "dashboard.html",
  "/my-account/dashboard":    "dashboard.html",
};

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  // 1. Clean-URL route match
  const mapped = ROUTES[pathname];
  if (mapped) {
    try {
      const res = await serveFile(req, mapped);
      return new Response(res.body, {
        status: 200,
        headers: { ...Object.fromEntries(res.headers), "Cache-Control": "no-cache" },
      });
    } catch {
      // fall through to static or 404
    }
  }

  // 2. Try serving path as a static asset (.html, .js, .css, images, json, etc.)
  try {
    const res = await serveDir(req, {
      fsRoot: ".",
      showDirListing: false,
      enableCors: true,
      quiet: true,
    });
    if (res.status !== 404) return res;
  } catch {
    // fall through to 404
  }

  // 3. 404
  try {
    const body = await Deno.readFile("404.html");
    return new Response(body, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("404 Not Found", { status: 404 });
  }
}

Deno.serve(handler);
