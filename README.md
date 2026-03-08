# AliExpress Brasil HTML Scraper

Web browser automation untuk scraping HTML dari AliExpress Brasil menggunakan [rebrowser-puppeteer](https://www.npmjs.com/package/rebrowser-puppeteer) dengan anti-detection.

## Setup

```bash
npm install
```

## Penggunaan

1. Edit `config.json` — tambahkan URL AliExpress Brasil yang ingin di-scrape
2. Jalankan:

```bash
npm start
```

3. Hasil scraping tersimpan di folder `output/` dalam format JSON

## Konfigurasi

| Field | Deskripsi |
|---|---|
| `urls` | Array URL AliExpress Brasil target |
| `browser.headless` | `false` (default, lebih aman dari deteksi) atau `true` |
| `browser.viewport` | Resolusi browser (width x height) |
| `scraper.timeout` | Timeout navigasi dalam ms |
| `scraper.delayBetweenPages` | Random delay antar halaman (min/max ms) |
| `scraper.maxRetries` | Jumlah retry jika halaman gagal dimuat |
| `output.directory` | Folder output |
| `output.prettyPrint` | `true` untuk JSON yang readable |

## Output

Setiap halaman menghasilkan satu file JSON:

```json
{
  "url": "https://pt.aliexpress.com/...",
  "statusCode": 200,
  "scrapedAt": "2026-03-08T12:00:00.000Z",
  "status": "success",
  "hasCaptcha": false,
  "html": "<!DOCTYPE html>..."
}
```

Status yang mungkin: `success`, `captcha_detected`, `success_after_captcha`
