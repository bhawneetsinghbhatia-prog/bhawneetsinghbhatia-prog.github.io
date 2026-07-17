import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { buildSourceUrl } from './url-builders.mjs';
import { interpretPage } from './extract.mjs';
import { ROOT } from './config.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectOne(browser, job, tracker) {
  const checkedAt = new Date().toISOString();
  const url = buildSourceUrl(job.source, job.hotel, job.stay, tracker.stay);
  const base = {
    hotelId: job.hotel.id,
    hotelName: job.hotel.name,
    sourceId: job.source.id,
    sourceName: job.source.name,
    checkIn: job.stay.checkIn,
    checkOut: job.stay.checkOut,
    nights: job.stay.nights,
    guests: tracker.stay,
    checkedAt,
    requestedUrl: url
  };

  const context = await browser.newContext({
    locale: tracker.locale,
    timezoneId: tracker.timezone,
    colorScheme: 'light',
    viewport: { width: 1440, height: 1100 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: tracker.collection.navigationTimeoutMs });
    await page.waitForTimeout(2500);
    const result = interpretPage({
      bodyText: await page.locator('body').innerText({ timeout: 10000 }),
      title: await page.title(),
      url: page.url(),
      expectedHotel: job.hotel.name,
      expectedStay: job.stay,
      expectedGuests: tracker.stay,
      currency: tracker.currency
    });

    if (result.status !== 'VERIFIED' && tracker.collection.saveFailureScreenshots) {
      const directory = path.join(ROOT, 'evidence', job.stay.checkIn, job.hotel.id);
      await mkdir(directory, { recursive: true });
      const screenshotPath = path.join(directory, `${job.source.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.evidencePath = path.relative(ROOT, screenshotPath).replaceAll('\\', '/');
    }
    return { ...base, ...result };
  } catch (error) {
    const message = String(error?.message || error);
    return {
      ...base,
      status: message.includes('Timeout') ? 'TIMED_OUT' : 'ACCESS_ERROR',
      failureReason: message.slice(0, 500),
      bookingUrl: url
    };
  } finally {
    await context.close();
  }
}

export async function collectJobs(jobs, tracker, onProgress = () => {}) {
  const browser = await chromium.launch({ headless: true });
  let cursor = 0;
  let completed = 0;
  const results = [];

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const result = await collectOne(browser, job, tracker);
      results.push(result);
      completed += 1;
      onProgress({ completed, total: jobs.length, result });
      await sleep(tracker.collection.delayBetweenRequestsMs);
    }
  }

  try {
    await Promise.all(Array.from({ length: tracker.collection.concurrency }, () => worker()));
  } finally {
    await browser.close();
  }
  return results;
}
