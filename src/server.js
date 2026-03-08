import { readFile } from 'fs/promises';
import express from 'express';
import { launchBrowser, createPage, parseProxyString } from './browser.js';
import { scrapeHTML } from './scraper.js';
import { retry, saveToJSON, sanitizeFilename } from './utils.js';

async function loadConfig() {
  const raw = await readFile(new URL('../config.json', import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

function resolveProxy(reqProxy, configProxy) {
  if (reqProxy) {
    if (typeof reqProxy === 'string') return parseProxyString(reqProxy);
    return reqProxy;
  }
  if (configProxy?.enabled) return configProxy;
  return null;
}

async function checkIP(browser, config, proxy) {
  const page = await createPage(browser, config, proxy);
  try {
    await page.goto('https://ipinfo.io/json', { waitUntil: 'networkidle2', timeout: 15000 });
    const ipInfo = await page.evaluate(() => {
      try { return JSON.parse(document.body.innerText); } catch { return null; }
    });
    return ipInfo;
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  const config = await loadConfig();
  const port = config.server?.port ?? 3001;
  const { directory: outputDir, prettyPrint } = config.output;

  const app = express();
  app.use(express.json());

  app.post('/api/aliexpress/pdp/sync', async (req, res) => {
    const { url, proxy: reqProxy } = req.body ?? {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "url" in request body' });
    }

    if (!url.includes('aliexpress.com')) {
      return res.status(400).json({ error: 'URL must be an AliExpress URL' });
    }

    const proxy = resolveProxy(reqProxy, config.browser.proxy);
    const proxyLabel = proxy ? `${proxy.host}:${proxy.port}` : 'none';
    console.log(`\n[API] Request: ${url}`);
    console.log(`[API] Proxy: ${proxyLabel}`);

    const maxRetries = config.scraper.maxRetries ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let browser;
      let page;
      try {
        browser = await launchBrowser(config, proxy);
        page = await createPage(browser, config, proxy);

        const ipInfo = await checkIP(browser, config, proxy);
        if (ipInfo) {
          console.log(`[API] IP: ${ipInfo.ip} (${ipInfo.city}, ${ipInfo.country})`);
        }

        const result = await retry(
          () => scrapeHTML(page, url, config),
          2,
          'API'
        );

        if (result.hasCaptcha) {
          console.warn(`[API] Captcha (attempt ${attempt}/${maxRetries}), will relaunch...`);
          if (attempt < maxRetries) continue;

          console.error(`[API] Captcha persists after ${maxRetries} attempts`);
          return res.status(503).json(result);
        }

        const filename = `${sanitizeFilename(url)}_${Date.now()}.json`;
        await saveToJSON(result, filename, outputDir, prettyPrint);

        console.log(`[API] Done: ${result.status} - ${url}`);
        return res.json(result);
      } catch (err) {
        console.error(`[API] Error (attempt ${attempt}/${maxRetries}): ${err.message}`);

        if (attempt < maxRetries) continue;

        return res.status(500).json({ error: 'Scraping failed', message: err.message });
      } finally {
        try { if (page) await page.close(); } catch { /* ignore */ }
        try { if (browser) await browser.close(); } catch { /* ignore */ }
      }
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`  POST /api/aliexpress/pdp/sync  { "url": "...", "proxy": "user:pass@host:port" }`);
    console.log(`  GET  /health`);
    console.log(`\nBrowser launches per-request (no persistent browser).`);
  });

  function shutdown() {
    console.log('\nShutting down...');
    server.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
