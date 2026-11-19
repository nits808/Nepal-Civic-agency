import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import DIST_MAP from geography config
import { DIST_MAP } from '../../frontend/src/config/geography.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const CSV_PATH = path.join(__dirname, 'discovered_sources.csv');

// Initialize CSV Writer
const csvWriter = createObjectCsvWriter({
  path: CSV_PATH,
  header: [
    { id: 'district', title: 'District' },
    { id: 'pageName', title: 'Page_Name' },
    { id: 'url', title: 'URL' },
    { id: 'date', title: 'Discovery_Date' }
  ],
  append: fs.existsSync(CSV_PATH)
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runCrawler() {
  const districts = [...new Set(Object.keys(DIST_MAP))];
  console.log(`[Crawler] Initializing for ${districts.length} districts...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Set randomized viewport
  await page.setViewport({ width: 1280 + Math.floor(Math.random() * 100), height: 800 + Math.floor(Math.random() * 100) });

  for (const district of districts) {
    console.log(`\n[Crawler] Searching for district: ${district}...`);
    
    // DuckDuckGo Query
    const query = `site:facebook.com "${district}" news tv khabar samachar`;
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&ia=web`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for results to load
      try {
        await page.waitForSelector('article', { timeout: 10000 });
      } catch (e) {
        console.log(`[Info] No standard results found for ${district} (Timeout/No results)`);
      }

      const content = await page.content();
      const $ = cheerio.load(content);
      const results = [];

      // DDG Search Result Selectors: article.result
      $('article').each((i, el) => {
        const title = $(el).find('h2').text() || $(el).find('a[data-testid="result-title-a"]').text();
        const rawUrl = $(el).find('a[href*="facebook.com"]').attr('href');

        if (title && rawUrl) {
          try {
            const urlObj = new URL(rawUrl);
            const cleanUrl = urlObj.origin + urlObj.pathname;
            
            // Basic relevance filter
            const lowerTitle = title.toLowerCase();
            const keywords = ['news', 'tv', 'khabar', 'samachar'];
            const isRelevant = lowerTitle.includes(district.toLowerCase()) || keywords.some(k => lowerTitle.includes(k));

            if (isRelevant && cleanUrl.includes('facebook.com')) {
              results.push({
                district,
                pageName: title.trim(),
                url: cleanUrl,
                date: new Date().toISOString().split('T')[0]
              });
            }
          } catch (e) {}
        }
      });

      if (results.length > 0) {
        await csvWriter.writeRecords(results);
        console.log(`[Success] Found ${results.length} sources for ${district}.`);
      } else {
        // Fallback: check for links even without article wrapper
        const fbLinks = await page.$$eval('a[href*="facebook.com"]', links => 
            links.map(l => ({ href: l.href, text: l.innerText }))
        );
        if (fbLinks.length > 0) {
            const fallbackResults = fbLinks
                .filter(l => {
                    try {
                        const u = new URL(l.href);
                        return u.hostname.includes('facebook.com') && 
                               (l.text.toLowerCase().includes(district.toLowerCase()) || 
                                ['news','tv','khabar','samachar'].some(k => l.text.toLowerCase().includes(k)));
                    } catch { return false; }
                })
                .map(l => {
                    const u = new URL(l.href);
                    return {
                        district,
                        pageName: l.text.trim().replace(/\s+/g, ' '),
                        url: u.origin + u.pathname,
                        date: new Date().toISOString().split('T')[0]
                    };
                })
                .filter(r => r.url.includes('facebook.com/')); // Final sanity check
                
            if (fallbackResults.length > 0) {
                await csvWriter.writeRecords(fallbackResults);
                console.log(`[Success] Found ${fallbackResults.length} fallback sources for ${district}.`);
                continue;
            }
        }
        console.log(`[Info] No relevant sources found for ${district}.`);
      }

      // Random delay 5-15 seconds
      const waitTime = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
      console.log(`[Wait] Sleeping for ${Math.round(waitTime / 1000)}s...`);
      await delay(waitTime);

    } catch (error) {
      console.error(`[Error] Failed to crawl ${district}:`, error.message);
      await delay(10000);
    }
  }

  await browser.close();
  console.log('\n[Crawler] Source Discovery Complete.');
}

runCrawler().catch(err => {
  console.error('[Fatal Error]', err);
});
