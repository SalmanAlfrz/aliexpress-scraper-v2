import puppeteer from 'rebrowser-puppeteer';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function launchBrowser(config) {
  const { headless, viewport, proxy } = config.browser;

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=' + viewport.width + ',' + viewport.height,
    '--lang=pt-BR',
  ];

  if (proxy?.enabled) {
    args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
    console.log(`Proxy enabled: ${proxy.host}:${proxy.port}`);
  }

  const executablePath = config.browser?.chromePath || undefined;
  if (executablePath) {
    console.log(`Chrome path: ${executablePath}`);
  } else {
    console.log('Chrome path not found, using default');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless,
    args,
    defaultViewport: {
      width: viewport.width,
      height: viewport.height,
    },
  });

  return browser;
}

export async function createPage(browser, config) {
  const page = await browser.newPage();

  const { proxy } = config.browser;
  if (proxy?.enabled && proxy.username && proxy.password) {
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    });
  }

  await page.setUserAgent(getRandomUserAgent());

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  });

  await page.evaluateOnNewDocument(() => {
    Intl.DateTimeFormat.prototype.resolvedOptions = new Proxy(
      Intl.DateTimeFormat.prototype.resolvedOptions,
      {
        apply(target, thisArg, args) {
          const result = Reflect.apply(target, thisArg, args);
          result.timeZone = 'America/Sao_Paulo';
          return result;
        },
      }
    );
  });

  page.setDefaultNavigationTimeout(config.scraper.timeout);

  return page;
}
