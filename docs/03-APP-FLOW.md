# DOCUMENT 3: APP FLOW: NAVIGATION LOGIC

## 3.1 Entry Points
- **Shopkeeper**: scans QR code or sends join message on WhatsApp -> receives welcome message with example commands -> sends first stock message.
- **Website visitor (owner or judge)**: opens Smart Stack AI website -> Dashboard (home).

## 3.2 Screen List
1. **Dashboard**: Summary cards, stock table, top sellers, recent activity, export button, live status.
2. **Live Chat Preview**: Panel showing latest message, bot reply, parsed chips, and voice transcript.
3. **Inventory**: Full stock table with search, filters, inline editing of alert level and price.
4. **Transactions**: Full log with date range, search, type filter, and CSV export.
5. **Alerts**: Low-stock and negative-stock warnings, mark as reordered, copyable reorder message.
6. **Reports**: Today, 7-day and 30-day revenue and units sold; top and slowest items.
7. **Onboarding / Join**: QR code, join steps, and example messages in four languages (EN, HI, MR, Hinglish).
8. **Settings**: Vendor profile, default alert level, language, notification preferences.

## 3.3 Navigation Map
- Dashboard -> click stock row -> Inventory (item expanded).
- Dashboard -> "View all activity" -> Transactions.
- Dashboard -> click Low Stock card -> Alerts.
- Dashboard -> "Export CSV" -> file download (no screen change).
- Inventory -> edit alert level or price -> inline save -> toast "Saved".
- Alerts -> "Mark reordered" -> item removed from active alerts.
- Any screen -> sidebar (desktop) or bottom tabs (mobile: Dashboard, Inventory, Activity, Alerts, More).
- More -> Reports, Onboarding / Join, Settings.

## 3.4 WhatsApp Message Flow
- Shopkeeper sends text or voice note -> Twilio forwards to `POST /webhook`.
- Voice note -> download audio -> transcribe -> continue as text (reply begins with what was heard).
- Command words (`help`, `stock`, `low`, `report`, `undo`, `alert`) -> run command and reply.
- Otherwise -> rule-based parser -> if nothing found, LLM fallback -> validate result.
- Valid result -> single database transaction -> alerts evaluated -> live stream notified -> confirmation reply with warnings.
- Nothing understood -> help reply with examples.

## 3.5 Auth Flow
- MVP: dashboard opens directly with no login. WhatsApp messages from unknown number automatically create a new vendor inventory.
- Phase 2: dashboard login screen.

## 3.6 Edge Cases
- Backend offline -> dashboard shows "Can't reach the server" banner with Retry button; Live indicator turns Offline.
- Empty inventory -> empty state with example message and Copy example button.
- No search results -> "No matches" with Clear filters button.
- Message not understood -> help reply; nothing changed.
- Selling more than stock -> stock goes negative, warning sent, item flagged on Alerts screen.
- Voice note cannot be transcribed -> reply asking user to type it.
- Wrong entry -> user sends "undo".
- Live stream disconnects -> indicator shows Reconnecting and page re-fetches data on reconnect.

## 3.7 Permissions
WhatsApp message and phone number received through Twilio only after shopkeeper joins. Consent line in welcome message. No device permissions needed on dashboard.
