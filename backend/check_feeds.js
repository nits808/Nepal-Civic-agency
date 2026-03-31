import { RSS_FEEDS } from './feeds.js';
import { fetchAllFeeds } from './fetcher.js';

async function checkDeadFeeds() {
  console.log(`Checking ${RSS_FEEDS.length} feeds...`);
  const results = await fetchAllFeeds();
  
  const deadFeeds = [];
  const now = Date.now();
  const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const feedResult = r.value;
      if (!feedResult.ok) {
        deadFeeds.push({ name: feedResult.feed, reason: 'Failed to fetch or parse: ' + feedResult.error });
      } else if (feedResult.articles && feedResult.articles.length > 0) {
        // Find latest date
        let latestDate = 0;
        for (const a of feedResult.articles) {
          const t = new Date(a.date).getTime();
          if (!isNaN(t) && t > latestDate) {
            latestDate = t;
          }
        }
        
        if (latestDate === 0) {
          deadFeeds.push({ name: feedResult.feed, reason: 'No valid dates in articles' });
        } else if (now - latestDate > TWO_MONTHS_MS) {
          const daysOld = Math.floor((now - latestDate) / (24 * 60 * 60 * 1000));
          deadFeeds.push({ name: feedResult.feed, reason: `Latest article is ${daysOld} days old` });
        }
      } else {
        // No articles
        deadFeeds.push({ name: feedResult.feed, reason: 'Returns 0 articles' });
      }
    } else {
      deadFeeds.push({ name: 'Unknown', reason: 'Promise rejected' });
    }
  }

  console.log('\n--- DEAD OR INACTIVE FEEDS ---');
  deadFeeds.forEach(f => console.log(`- ${f.name}: ${f.reason}`));
  console.log(`Total dead/inactive: ${deadFeeds.length} out of ${RSS_FEEDS.length}`);
}

checkDeadFeeds();
