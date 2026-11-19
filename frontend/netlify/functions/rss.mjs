export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing url parameter", { status: 400 });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }

    // Only allow http and https
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new Response("Forbidden protocol", { status: 403 });
    }

    // Block private / loopback / link-local addresses
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return new Response("Access to private network denied", { status: 403 });
    }

    const fetchRes = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NCIG-Bot/3.0)",
      },
      signal: AbortSignal.timeout(8000),
    });

    const arrayBuffer = await fetchRes.arrayBuffer();

    return new Response(arrayBuffer, {
      status: fetchRes.status,
      headers: {
        "Content-Type": fetchRes.headers.get("content-type") || "application/xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: "/api/rss",
};
