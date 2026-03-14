# 44CLUB n8n Workflow Guide

Everything you need to build in n8n to power notifications, emails, and scheduled jobs.

---

## Environment Variables (set in Vercel)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Shared secret for authenticating cron/scheduled requests |
| `N8N_EMAIL_WEBHOOK_URL` | n8n webhook URL that receives email dispatch requests |
| `N8N_RSVP_WEBHOOK_URL` | n8n webhook URL that receives RSVP event payloads |

---

## Workflow 1: Daily Reconciliation (Cron)

**Purpose:** Compute discipline scores, update streaks, evaluate badge eligibility, generate team overviews.

**Schedule:** Daily at `23:30 Europe/London` (after most users' days end)

### n8n Nodes

```
[Schedule Trigger] → [HTTP Request] → [IF success] → [No Op / Slack alert on failure]
```

**Schedule Trigger:**
- Cron: `30 23 * * *` (23:30 daily)
- Timezone: Europe/London

**HTTP Request:**
- Method: `POST`
- URL: `https://your-app.vercel.app/api/reconciliation`
- Headers:
  - `x-cron-secret`: `{{$env.CRON_SECRET}}`
  - `Content-Type`: `application/json`
- Body: empty `{}`
- Timeout: 120 seconds (this job processes all users)

**Expected Response:**
```json
{
  "success": true,
  "users_processed": 45,
  "dates_resolved": 45,
  "teams_updated": 5,
  "errors": []
}
```

**Error Handling:**
- If `success` is `false` or HTTP status is not 200, send alert (Slack/email)
- The endpoint is idempotent — safe to retry on failure

---

## Workflow 2: Daily Summary Notifications (Cron)

**Purpose:** Notify all active users that their daily summary is available.

**Schedule:** Daily at `12:00 Europe/London`

### n8n Nodes

```
[Schedule Trigger] → [HTTP Request] → [IF success] → [No Op / alert on failure]
```

**Schedule Trigger:**
- Cron: `0 12 * * *` (noon daily)
- Timezone: Europe/London

**HTTP Request:**
- Method: `POST`
- URL: `https://your-app.vercel.app/api/summary`
- Headers:
  - `x-cron-secret`: `{{$env.CRON_SECRET}}`
  - `Content-Type`: `application/json`
- Body: empty `{}`
- Timeout: 60 seconds

**Expected Response:**
```json
{
  "ok": true,
  "summaryDate": "2026-03-14",
  "userCount": 45
}
```

**Idempotency:** The endpoint checks `daily_summary_runs` — running twice for the same date returns `{ ok: true, skipped: true }`.

---

## Workflow 3: Notification Email Dispatch (Cron)

**Purpose:** Process the `notification_dispatch_queue` table, pick up pending emails, and deliver them.

**Schedule:** Every 5 minutes (or every 2 minutes for faster delivery)

### n8n Nodes

```
[Schedule Trigger] → [HTTP Request] → [IF processed > 0] → [Log/No Op]
```

**Schedule Trigger:**
- Cron: `*/5 * * * *` (every 5 minutes)

**HTTP Request:**
- Method: `POST`
- URL: `https://your-app.vercel.app/api/notifications/dispatch`
- Headers:
  - `x-cron-secret`: `{{$env.CRON_SECRET}}`
  - `Content-Type`: `application/json`
- Body: empty `{}`
- Timeout: 30 seconds

**Expected Response:**
```json
{
  "ok": true,
  "processed": 12,
  "sent": 10,
  "failed": 1,
  "skipped": 1
}
```

**How it works internally:**
1. The dispatch endpoint picks up 50 pending rows from `notification_dispatch_queue`
2. For each email row, it fetches the user's `whop_email` from `profiles`
3. It calls `N8N_EMAIL_WEBHOOK_URL` (Workflow 4 below) with the email payload
4. Marks rows as `sent` or `failed` (retries up to `max_attempts`)

---

## Workflow 4: Email Sender (Webhook)

**Purpose:** Receive email payloads from the dispatch processor and send actual emails via your provider (Mailgun, Resend, SendGrid, etc.)

**Trigger:** Webhook (this is the `N8N_EMAIL_WEBHOOK_URL`)

### n8n Nodes

```
[Webhook Trigger] → [Send Email node (your provider)] → [Respond to Webhook]
```

**Webhook Trigger:**
- Method: POST
- Path: `/notification-email` (or whatever you choose)
- Response mode: "Last Node" or "Respond to Webhook"

**Incoming Payload (from the dispatch processor):**
```json
{
  "type": "notification_email",
  "to": "user@example.com",
  "subject": "You're in — Weekly Call",
  "body": "You're confirmed for Weekly Call on 2026-03-15T18:00:00Z.",
  "user_name": "John",
  "event_key": "event_rsvp_confirmed",
  "event_id": "uuid-here",
  "event_title": "Weekly Call",
  "starts_at": "2026-03-15T18:00:00Z",
  "timezone": "Europe/London"
}
```

**Send Email Node Configuration:**
- **To:** `{{ $json.to }}`
- **Subject:** `{{ $json.subject }}`
- **Body/HTML:** Build your email template using the fields above
- Provider options:
  - **Resend** — use the Resend node
  - **SendGrid** — use the SendGrid node
  - **Mailgun** — use the HTTP Request node to Mailgun API
  - **SMTP** — use the Send Email node with SMTP credentials

**Email Template Branching (optional):**
Use a Switch node on `{{ $json.event_key }}` to route to different templates:

| `event_key` | Template |
|-------------|----------|
| `event_rsvp_confirmed` | "You're confirmed for {event_title}" |
| `event_waitlist_confirmed` | "You're on the waitlist for {event_title}" |
| `event_waitlist_promoted` | "A spot opened up — you're in for {event_title}" |
| `event_new_published` | "New event: {event_title}" |
| `daily_summary_available` | "Your daily summary is ready" |

**Respond to Webhook:**
- Return `{ "ok": true }` on success
- Return HTTP 500 on failure (dispatch processor will retry)

---

## Workflow 5: RSVP Event Webhook (Webhook)

**Purpose:** Receive RSVP events in real-time and take action (send confirmation email, log to CRM, update spreadsheet, etc.)

**Trigger:** Webhook (this is the `N8N_RSVP_WEBHOOK_URL`)

### n8n Nodes

```
[Webhook Trigger] → [Switch on response] → [Send Email / Log / CRM update]
```

**Webhook Trigger:**
- Method: POST
- Path: `/rsvp-webhook` (or whatever you choose)

**Incoming Payload:**
```json
{
  "type": "event_rsvp",
  "response": "going",
  "event": {
    "id": "uuid",
    "title": "Weekly Call",
    "starts_at": "2026-03-15T18:00:00Z",
    "ends_at": "2026-03-15T19:00:00Z",
    "timezone": "Europe/London",
    "location_type": "online",
    "location_text": null,
    "meeting_url": "https://meet.google.com/abc-xyz",
    "city": null,
    "spots_left": 3
  },
  "user": {
    "id": "user-uuid",
    "name": "John",
    "email": "john@example.com"
  },
  "timestamp": "2026-03-14T10:30:00.000Z"
}
```

**Switch on `response`:**

| `response` value | Action |
|------------------|--------|
| `going` | Send confirmation email with event details + calendar link |
| `waitlist` | Send "you're on the waitlist" email |
| `cancelled` | Optional: send cancellation confirmation |

**Note:** This webhook fires in real-time from the RSVP API route (not from the dispatch queue). It's a direct fire-and-forget call. The dispatch queue handles the deduplicated email separately — this webhook is for any additional integrations you want (CRM, Google Sheets, Slack channel, etc.)

---

## Workflow 6: Event Broadcast Trigger (Optional — Webhook or Cron)

**Purpose:** When a new event is published, broadcast notifications to all active users.

### Option A: Manual/Admin Trigger via Webhook

```
[Webhook Trigger] → [HTTP Request to /api/events/broadcast]
```

Call from your admin panel or manually when you publish an event:

**HTTP Request:**
- Method: `POST`
- URL: `https://your-app.vercel.app/api/events/broadcast`
- Headers:
  - `x-cron-secret`: `{{$env.CRON_SECRET}}`
  - `Content-Type`: `application/json`
- Body: `{ "eventId": "the-event-uuid" }`

### Option B: Database Trigger (Supabase Realtime)

```
[Supabase Trigger on events table] → [IF status = 'published'] → [HTTP Request to /api/events/broadcast]
```

Listen for UPDATE on the `events` table where `status` changes to `published`, then call the broadcast endpoint.

**Expected Response:**
```json
{
  "ok": true,
  "userCount": 45,
  "alreadyBroadcast": false
}
```

**Idempotency:** The `event_broadcasts` table prevents duplicate broadcasts. Safe to call multiple times.

---

## Summary: What to Build

| # | Workflow | Trigger | Frequency | Priority |
|---|----------|---------|-----------|----------|
| 1 | Daily Reconciliation | Schedule | `23:30` daily | **Critical** |
| 2 | Daily Summary | Schedule | `12:00` daily | **High** |
| 3 | Email Dispatch Processor | Schedule | Every 5 min | **Critical** |
| 4 | Email Sender | Webhook | On demand | **Critical** |
| 5 | RSVP Webhook Handler | Webhook | On demand | **Medium** |
| 6 | Event Broadcast | Webhook/Manual | On demand | **Medium** |

---

## How It All Fits Together

```
                          ┌──────────────────────────────────┐
                          │         YOUR APP (Vercel)        │
                          ├──────────────────────────────────┤
                          │                                  │
  User RSVPs to event ──→ │  /api/events/rsvp                │
                          │    ├─ Updates event_rsvps        │
                          │    ├─ Creates in-app notification │
                          │    ├─ Queues email (dispatch tbl) │
                          │    └─ Fires RSVP webhook ────────────→ [WF5: RSVP Webhook]
                          │                                  │       (CRM, Sheets, etc.)
                          │                                  │
  n8n cron (every 5m) ──→ │  /api/notifications/dispatch     │
                          │    ├─ Picks up pending emails    │
                          │    └─ Calls email webhook ───────────→ [WF4: Email Sender]
                          │                                  │       (Resend/SendGrid/etc.)
                          │                                  │
  n8n cron (12:00) ─────→ │  /api/summary                   │
                          │    ├─ Creates in-app notifs      │
                          │    └─ Queues emails              │
                          │                                  │
  n8n cron (23:30) ─────→ │  /api/reconciliation             │
                          │    ├─ Scores all users           │
                          │    ├─ Updates streaks/badges     │
                          │    └─ Generates team overviews   │
                          │                                  │
  Admin publishes event → │  /api/events/broadcast           │
                          │    ├─ Creates in-app notifs      │
                          │    └─ Queues emails for all      │
                          └──────────────────────────────────┘

  In-app notifications arrive instantly via Supabase Realtime → popup over header
```

---

## Environment Setup Checklist

1. **Set `CRON_SECRET`** in Vercel environment variables (generate a random 32+ char string)
2. **Create Workflow 4** (Email Sender) first — get the webhook URL
3. **Set `N8N_EMAIL_WEBHOOK_URL`** in Vercel to the Workflow 4 webhook URL
4. **Create Workflow 5** (RSVP Webhook) — get the webhook URL
5. **Set `N8N_RSVP_WEBHOOK_URL`** in Vercel to the Workflow 5 webhook URL
6. **Create Workflows 1-3** (the cron jobs) — these call your app
7. **Test each workflow** by triggering manually in n8n
8. **Activate all workflows** in n8n

---

## Testing

Each endpoint supports a `GET` request that returns health/config status:

```bash
# Check reconciliation
curl https://your-app.vercel.app/api/reconciliation

# Check dispatch
curl https://your-app.vercel.app/api/notifications/dispatch

# Check summary
curl https://your-app.vercel.app/api/summary

# Check RSVP webhook config
curl https://your-app.vercel.app/api/events/rsvp-webhook
```

To trigger a cron job manually:
```bash
curl -X POST https://your-app.vercel.app/api/reconciliation \
  -H "x-cron-secret: YOUR_SECRET" \
  -H "Content-Type: application/json"
```
