import { readFile } from 'fs/promises';
import { launchBrowser, createPage } from './browser.js';
import { scrapeHTML } from './scraper.js';
import { retry, saveToJSON, sanitizeFilename, randomDelay } from './utils.js';

async function loadConfig() {
  const raw = await readFile(new URL('../config.json', import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const config = await loadConfig();
  const { urls } = config;
  const { directory: outputDir, prettyPrint } = config.output;

  console.log(`AliExpress Brasil Scraper`);
  console.log(`URLs to scrape: ${urls.length}`);
  console.log('---');

  let browser;
  try {
    browser = await launchBrowser(config);
    const page = await createPage(browser, config);

    console.log('\nChecking IP address...');
    await page.goto('https://ipinfo.io/json', { waitUntil: 'networkidle2' });
    const ipInfo = await page.evaluate(() => {
      try {
        return JSON.parse(document.body.innerText);
      } catch {
        return null;
      }
    });
    if (ipInfo) {
      console.log(`  IP       : ${ipInfo.ip}`);
      console.log(`  Location : ${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`);
      console.log(`  Org      : ${ipInfo.org}`);
      console.log(`  Timezone : ${ipInfo.timezone}`);
    } else {
      console.warn('  Could not retrieve IP info');
    }
    console.log('---');

    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

      const result = await retry(
        () => scrapeHTML(page, url, config),
        config.scraper.maxRetries,
        `Page ${i + 1}`
      );

      const filename = `${sanitizeFilename(url)}_${Date.now()}.json`;
      await saveToJSON(result, filename, outputDir, prettyPrint);
      results.push({ url, status: result.status, file: filename });

      if (i < urls.length - 1) {
        console.log('Waiting before next page...');
        await randomDelay(
          config.scraper.delayBetweenPages.min,
          config.scraper.delayBetweenPages.max
        );
      }
    }

    console.log('\n--- Summary ---');
    for (const r of results) {
      console.log(`  ${r.status.padEnd(22)} ${r.url}`);
    }
    console.log(`\nTotal: ${results.length} pages scraped`);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

main();
