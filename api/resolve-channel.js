export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL required' });

    let finalUrl = url.trim();
    let detectedType = 'media';
    let name = '';

    if (finalUrl.includes('youtube.com/') || finalUrl.includes('youtu.be/')) {
      detectedType = 'tv';
      if (!finalUrl.includes('videos.xml')) {
        const ytRes = await fetch(finalUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(6000)
        });
        const html = await ytRes.text();
        const channelIdMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/) ||
                               html.match(/itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)"/);
        if (channelIdMatch) {
          finalUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
        }
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
        if (titleMatch) name = titleMatch[1];
      }
    } else if (!finalUrl.includes('.xml') && !finalUrl.includes('/rss') && !finalUrl.includes('/feed')) {
      const u = new URL(finalUrl);
      const domain = u.hostname.replace(/^www\./, '');
      name = domain.split('.')[0].toUpperCase();
      finalUrl = `https://news.google.com/rss/search?q=site:${domain}`;
    }

    return res.status(200).json({
      resolvedUrl: finalUrl,
      type: detectedType,
      name
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
