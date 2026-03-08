import { mkdir } from 'fs/promises';
import { randomDelay, timestamp, sanitizeFilename } from './utils.js';

const CAPTCHA_TEXT_INDICATORS = [
  'captcha',
];

const CAPTCHA_SELECTORS = [
  'body > div:nth-child(36) > div.cosmos-drawer-wrap > div > button > span > button',
];

async function detectCaptcha(page) {
  const hasVerificationPopup = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const a of links) {
      if (a.textContent.trim() === '关闭' && a.closest('div[style*="width: 370px"]')) {
        return true;
      }
    }
    return false;
  });
  if (hasVerificationPopup) return true;

  return false;
}

const DISMISS_SELECTORS = [
  'button.cosmos-drawer-close',
  'button.close-icon-container.dialog-close-icon',
  'button.cosmos-drawer-close span button.close-icon-container',
];

async function dismissPopups(page) {
  for (const selector of DISMISS_SELECTORS) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        console.log(`Dismissed popup: ${selector}`);
        await randomDelay(500, 1000);
      }
    } catch {
      // ignore click errors
    }
  }
}

export async function scrapeHTML(page, url, config) {
  const { navigationWaitUntil, delayBetweenPages } = config.scraper;

  console.log(`Navigating to: ${url}`);

  const response = await page.goto(url, {
    waitUntil: navigationWaitUntil,
    timeout: config.scraper.timeout,
  });

  const statusCode = response?.status() ?? 0;
  console.log(`Response status: ${statusCode}`);

  await randomDelay(delayBetweenPages.min, delayBetweenPages.max);

  const hasCaptcha = await detectCaptcha(page);
  if (hasCaptcha) {
    console.warn(`Captcha detected on: ${url} — returning for relaunch`);
    return {
      url,
      statusCode,
      scrapedAt: timestamp(),
      status: 'captcha_detected',
      hasCaptcha: true,
      html: await page.content(),
    };
  }

  await dismissPopups(page);

  const outputDir = config.output?.directory || 'output';
  await mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: `${outputDir}/${sanitizeFilename(url)}_${Date.now()}.png` });
  console.log(`Screenshot saved: ${outputDir}/${sanitizeFilename(url)}_${Date.now()}.png`);

  const html = await page.content();

  return {
    url,
    statusCode,
    scrapedAt: timestamp(),
    status: 'success',
    hasCaptcha: false,
    html,
  };
}
