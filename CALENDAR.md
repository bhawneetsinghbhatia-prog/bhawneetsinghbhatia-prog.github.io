# Calendar & Tasks

The fourth WorkSuite tab keeps the current Pendency Tracker, Repayment Schedule and Notes. It shares the site's light/dark theme, Firebase sign-in, task editor and completion controls.

## Data and privacy

- Signed-in Pendency tasks are read from the existing Firebase task subscription. Edits and completion use the existing Firebase functions. Signing out removes private tasks from the calendar.
- `data/office-tasks.json` is an optional public feed, fetched on first opening the tab and on **Refresh feed**. The initial feed is empty; no Outlook connection or scheduled synchronization is enabled by this change.
- This repository and GitHub Pages are public. A login screen cannot protect committed data. Only publish summaries explicitly approved for public sharing. Keep confidential Outlook subjects, bodies, client details, links and identifiers in private storage such as the existing Firebase backend.
- GitHub feed entries are read-only in the website. Edit their source feed or use an authenticated future sync service. The calendar does not claim that local browser edits are saved to GitHub.

## Future Outlook sync contract

The feed has `version: 1`, an IANA `timezone` (default `Asia/Kolkata`), `updatedAt` (ISO timestamp or null), and a `tasks` array. Each task requires a stable opaque string `id`, a `title`, a `date` (`YYYY-MM-DD` or null for undated tasks), and `status` (`pending`, `completed`, or `cancelled`). Optional display fields: `desc`, `category`, `assignedTo`, `dueTime` and date-range fields `isDateRange`, `startDate`, `endDate` (with `date` equal to `endDate`).

An authenticated sync writer should upsert by ID, change the existing date when a deadline moves, and retain completed/cancelled records. Overdue is derived from today's date in the feed timezone, not written as a permanent state. Keep the mapping from Outlook messages to opaque task IDs private. Update `updatedAt` only after a successful sync and publish the feed atomically. Do not overwrite a newer update with an older briefing. Existing 9:00/2:30/6:30 schedules are unchanged.

If a private Firebase task represents a feed entry, set its `externalId` to the feed ID. The private task then takes precedence in that user's view, preventing duplicates. Normal Firebase tasks without this field remain independent. Firebase task documents need the existing `created` field because the subscription orders by it.

The month grid shows due-date markers. The adjacent list spans **all dates** by default, preserving overdue and future items outside the displayed month. Selecting a day narrows the list; **All dates** clears that selection. Status/search filters apply to both views. Completed and cancelled tasks never count as overdue. Undated tasks appear in the list.

## Validation

Run `node --test` for the existing tests and calendar date/status/feed tests. Serve the repository root over HTTP to preview `index.html`; the existing `npm run preview` serves the separate hotel report, not WorkSuite. No build step or added package is required.
