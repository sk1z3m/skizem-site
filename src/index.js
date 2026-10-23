// skizem-site Worker
// - skizem.com: the landing page (static files in public/)
// - projects.skizem.com: unfinished projects, served from public/projects/
//   e.g. projects.skizem.com/survival/ -> public/projects/survival/index.html
const PROJECTS_HOST = "projects.skizem.com";
const PREFIX = "/projects";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === PROJECTS_HOST) {
      // Unfinished work stays out of search engines.
      if (url.pathname === "/robots.txt") {
        return withNoindex(new Response("User-agent: *\nDisallow: /\n", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }));
      }
      const inner = new URL(url);
      inner.pathname = PREFIX + url.pathname;
      let res = await env.ASSETS.fetch(new Request(inner, request));
      if (res.status === 404) {
        // Shared files (site.css, favicon) live at the root of public/.
        const shared = await env.ASSETS.fetch(request);
        if (shared.status !== 404) res = shared;
      }
      return withNoindex(stripPrefixFromRedirect(res));
    }

    // Old or direct links to skizem.com/projects/... go to the subdomain.
    if (url.pathname === PREFIX || url.pathname.startsWith(PREFIX + "/")) {
      const to = new URL(url);
      to.hostname = PROJECTS_HOST;
      to.pathname = url.pathname.slice(PREFIX.length) || "/";
      return Response.redirect(to.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};

// The asset server adds trailing slashes with redirects like /projects/survival/.
// On the subdomain those must point to /survival/ instead.
function stripPrefixFromRedirect(res) {
  const loc = res.headers.get("location");
  if (!loc) return res;
  const u = new URL(loc, "https://" + PROJECTS_HOST);
  if (u.pathname !== PREFIX && !u.pathname.startsWith(PREFIX + "/")) return res;
  u.hostname = PROJECTS_HOST;
  u.pathname = u.pathname.slice(PREFIX.length) || "/";
  const out = new Response(res.body, res);
  out.headers.set("location", u.pathname + u.search);
  return out;
}

function withNoindex(res) {
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex");
  return out;
}
