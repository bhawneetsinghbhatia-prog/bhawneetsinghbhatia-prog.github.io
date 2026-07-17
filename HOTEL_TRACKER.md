# Udaipur hotel price tracker

This project checks a rolling window from **today through 30 days ahead** (31 check-in dates, inclusive). Each check-in uses a configurable stay length. The default occupancy is one room for two adults and one child aged eight.

The tracker uses a new Playwright browser context for every website visit. A price is marked `VERIFIED` only when the rendered page contains the hotel, a final payable amount, room type, meal plan, cancellation policy, and tax information. Search snippets and incomplete prices are never reported as confirmed.

## Hotels

The initial list lives in [`config/hotels.json`](config/hotels.json):

- Fairmont Udaipur Palace
- Jagat Niwas Palace
- The Oberoi Udaivilas
- Wyndham Grand Udaipur Fateh Sagar Lake
- Trident Udaipur

Add another hotel with:

```bash
npm run add-hotel -- --name "Hotel Name" --official-url "https://hotel.example" --booking-url "https://hotel.example/book"
```

You can also edit `config/hotels.json` directly. Set `enabled` to `false` to pause a hotel without deleting it.

## Choose the number of nights

Edit `stay.nights` in [`config/tracker.json`](config/tracker.json), or choose it when manually starting the GitHub workflow. An environment override also works:

```powershell
$env:STAY_NIGHTS = "2"
npm run track
```

The daily scheduled workflow uses the configured default of one night. Change the `STAY_NIGHTS` fallback in `.github/workflows/hotel-price-tracker.yml` when you decide the permanent scheduled stay length.

## Local verification

```bash
npm install
npm test
npm run dry-run
npm run smoke
npm run preview
npx playwright install chromium
```

The repository also includes a pnpm lockfile, and the cloud workflow uses pnpm for reproducible installs.

The dry run creates `data/dry-run-manifest.json` without visiting hotel websites. To exercise a single date before a full run:

```powershell
$env:MAX_DATES = "1"
npm run track
```

`npm run smoke` performs the default one-page Fairmont official-site check and prints the result without writing history or reports.

`npm run preview` serves the local report landing page at `http://127.0.0.1:4173`.

For a very small smoke test, filter to one hotel and source as well:

```powershell
$env:MAX_DATES = "1"
$env:HOTEL_IDS = "fairmont-udaipur-palace"
$env:SOURCE_IDS = "official"
npm run track
```

## GitHub setup

1. Create a private GitHub repository and push this project.
2. Enable Actions with read/write workflow permissions.
3. Run **Hotel price tracker** manually with `max_dates` set to `1` first.
4. Review the artifact and unverified reasons before enabling a full daily run.
5. Adjust the schedule in `.github/workflows/hotel-price-tracker.yml` if 5:17 AM Asia/Kolkata is not suitable.

Scheduled runs are active. The daily cloud job checks the Fairmont and Jagat Niwas official booking engines across the complete rolling 31-date window. Oberoi, Trident and Wyndham remain visible as unverified when their booking engines block or time out in the cloud browser; they are not represented by estimates.

The workflow commits `data/latest.json`, dated JSON snapshots, and Markdown/HTML reports. Committing the latest snapshot lets the next run calculate changes and gives a connected ChatGPT task a stable file to read. Raw failure screenshots are stored only as short-lived workflow artifacts when `saveFailureScreenshots` is enabled.

## Optional email

Add these repository secrets to email the report after each successful collection:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` for port 465; usually `false` for port 587)
- `SMTP_USER`
- `SMTP_PASS`
- `REPORT_FROM_EMAIL` (optional if it is the same as `SMTP_USER`)
- `REPORT_TO_EMAIL`

If the secrets are absent, collection and report generation still work and the log explains that email is disabled.

## ChatGPT Scheduled Tasks

The reliable delivery path is the email sent by GitHub Actions. A ChatGPT Scheduled Task can separately read `reports/latest.md` after the workflow finishes when the repository is accessible through a supported GitHub connection. Schedule it later than the GitHub run. Scheduled Tasks do not currently accept a webhook from this workflow.

## Practical limitations

Booking sites frequently change markup and may show CAPTCHA, require login, restrict cloud IP addresses, or expose taxes only after several interactive steps. The generic collector records those outcomes explicitly. Source-specific selectors or permitted partner APIs should be added for websites that do not expose a complete rendered booking summary. The code does not bypass CAPTCHA or label candidate prices as verified.
