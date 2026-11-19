export default async function handler(req, res) {
  try {
    const target = req.query?.url || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : null);
    if (!target) {
      return res.status(400).send("Missing url parameter");
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return res.status(400).send("Invalid URL");
    }

    // Only allow http and https
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return res.status(403).send("Forbidden protocol");
    }

    // Block loopback / private IP ranges (SSRF protection)
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
      return res.status(403).send("Access to private network denied");
    }

    const fetchRes = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NCIG-Bot/4.0",
        "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
      },
      signal: AbortSignal.timeout(9000),
    });

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", fetchRes.headers.get("content-type") || "application/xml; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(fetchRes.status).send(buffer);
  } catch (err) {
    return res.status(500).send(`Proxy Error: ${err.message}`);
  }
}
