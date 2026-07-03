import { serveDir } from "jsr:@std/http/file-server";

Deno.serve((req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    url.pathname = "/index.html";
  } else if (!url.pathname.includes(".")) {
    url.pathname += ".html";
  }

  return serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    url,
  });
});
