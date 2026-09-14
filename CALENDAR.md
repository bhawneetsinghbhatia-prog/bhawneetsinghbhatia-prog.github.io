# Calendar & Tasks

The fourth WorkSuite tab is a read-only calendar for pending actions produced by the scheduled Outlook briefing. It is separate from the Pendency Tracker, Repayment Schedule and Notes, while sharing the site's visual design.

## Data and privacy

- Pendency Tracker records stored in Firebase are never read, merged, or displayed by this calendar.
- `data/office-tasks.json` is the calendar's sole data source. The scheduled Outlook task writes sanitized pending actions to it, and the website refreshes it when the tab opens or **Refresh scheduled pendency** is selected.
- This repository and GitHub Pages are public. A login screen cannot protect committed data. Only publish summaries explicitly approved for public sharing. Keep confidential Outlook subjects, bodies, client details, links and identifiers in private storage such as the existing Firebase backend.
- Scheduled entries are read-only in the website. Their state is controlled by the scheduled Outlook task.

## Future Outlook sync contract

The feed has `version: 1`, an IANA `timezone` (default `Asia/Kolkata`), `updatedAt` (ISO timestamp or null), and a `tasks` array. Every displayed task requires an opaque `id` beginning with `outlook-`, a generic `title`, a `date` (`YYYY-MM-DD` or null), and `status: "pending"`. Optional safe display fields are `category` and `dueTime`.

The scheduled writer upserts by ID and changes dates when deadlines move. When Outlook explicitly confirms completion, cancellation, or supersession, it removes the corresponding record from this pending-only feed. Overdue is derived from today's date. The mapping from Outlook messages to opaque IDs remains private. `updatedAt` changes only after a successful sync.

The month grid shows due-date markers. The adjacent list spans **all dates** by default, preserving overdue and future pending items outside the displayed month. Selecting a day narrows the list; **All dates** clears that selection. Undated pending tasks appear in the list.

## Validation

Run `node --test` for the existing tests and calendar date/status/feed tests. Serve the repository root over HTTP to preview `index.html`; the existing `npm run preview` serves the separate hotel report, not WorkSuite. No build step or added package is required.
