---
navLabel: Alerts
contentType: How-to
description: Send OpenProfit alerts to Slack, to your own endpoint or to a phone by SMS, and check the signature on webhook requests.
---

# Get alerts in Slack, at your endpoint or by SMS

OpenProfit opens an alert when a rule on the **Alerts** page finds a cost spike, a margin under its floor or a failed sync, and emails every member of the workspace. This page shows you how to also send each alert to Slack, to your own endpoint or to a phone, and how to check the signature on webhook requests.

## Add a channel

Open **Alerts** and find **Channels** under the rules. Each alert goes to every channel you set up and to every member by email. Click **Send test** to check a channel. **Remove** deletes what you entered and stops the alerts to that channel.

## Post to Slack

In your Slack app, create an [incoming webhook](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks) for the channel you want. Paste its URL, which starts with `https://hooks.slack.com/services/`, into **Slack** and click **Save**.

## Send alerts to your own endpoint

Paste your endpoint's URL into **Webhook** and click **Save**. OpenProfit shows the signing secret once, so copy it into your endpoint's settings before you leave the page. **Rotate secret** creates a new secret, and the old one stops working at once.

Each alert arrives as a `POST` request with a JSON body:

```json
{
  "type": "alert.opened",
  "id": "alert_id",
  "workspace": { "id": "workspace_id", "name": "Acme Labs" },
  "kind": "cost_spike",
  "title": "OpenAI spend at 2.4x its daily average",
  "detail": "$84 yesterday, against $35 a day over the 7 days before",
  "opened_at": "2026-10-06T09:15:00.000Z",
  "link": "https://openprofit.dev/app/alerts"
}
```

The fields that change between alerts:

- **`kind`**: `cost_spike`, `margin_floor` or `sync_failure`
- **`detail`**: the numbers behind the alert, or `null`
- **`type`**: `alert.test` with `kind` set to `test` when you click **Send test**

OpenProfit counts any 2xx response as delivered and gives up after 15 seconds. It doesn't retry a failed request; the alert stays on the **Alerts** page and in the email. On openprofit.dev, the URL must start with `https://` and point to a public address.

## Check the webhook signature

Requests follow the [Standard Webhooks](https://www.standardwebhooks.com) scheme. OpenProfit signs `webhook-id.webhook-timestamp.body` with HMAC-SHA256 and sends the result in the `webhook-signature` header as `v1,` plus the signature in base64. The key is your secret without its `whsec_` prefix, decoded from base64. The `webhook-id` header holds the alert id, so you can drop a request you've already handled.

Pass the raw request body, before you parse it:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(body: string, headers: Headers, secret: string) {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sig = headers.get("webhook-signature");
  if (!id || !ts || !sig) return false;
  // Refuse requests older than 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const want = createHmac("sha256", key)
    .update(`${id}.${ts}.${body}`)
    .digest();
  return sig.split(" ").some((part) => {
    const got = Buffer.from(part.split(",")[1] ?? "", "base64");
    return got.length === want.length && timingSafeEqual(got, want);
  });
}
```

## Text alerts by SMS

An SMS holds the alert's title and a link to the **Alerts** page. Each workspace has one number:

1. Enter the number with its country code, such as `+14155550100`, and click **Send code**.
2. Type the 6-digit code from the text and click **Verify**.

A code works for 10 minutes and 5 tries, and you can ask for a new one after a minute. Only a verified number gets alerts.

On openprofit.dev, SMS comes with the Indie and Pro plans, up to 30 texts per workspace per calendar month in UTC. Verification codes and tests count toward the 30. The 30th text says it's the last one, and alerts keep going to email and your other channels until the month ends.

A self-hosted instance offers SMS once you set the three Twilio variables in the [environment variables reference](/docs/environment#sms-alerts), with no monthly limit.
