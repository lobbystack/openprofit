# Privacy Policy

Last updated: October 6, 2026

This policy explains what personal information OpenProfit collects, why, and what you can do about it. OpenProfit is operated by Lobbystack Inc., Montreal, Quebec, Canada ("we", "us"). It covers the hosted service at openprofit.dev. If you run the open-source software on your own server, we receive nothing from it unless you switch on the usage ping described in section 5.

## 1. What we collect

**Account information.** Your email address, and if you sign in with Google or GitHub, the name, email and avatar they share with us. We never see your password for those services.

**Workspace information.** The workspace name, base currency, products you create, and the settings you choose.

**Provider credentials.** The API keys and tokens you give us to connect a provider. They are encrypted at rest with a key that is not stored with the data, and decrypted only to call that provider.

**Financial data from providers.** Transactions, fees, refunds, subscriptions, customer counts and usage charges that the providers you connect report to us. This can include your customers' transaction amounts and dates. It does not include your customers' names, emails or card details; we do not request those fields.

**Billing.** If you pay for a plan, Polar Software Inc. collects your name, email, billing address and payment details as merchant of record. We receive your email, the plan, and the subscription status. We do not receive card numbers.

**Usage and technical data.** Server logs with IP address, browser and request details, kept for 30 days for security and debugging. We send server logs, request timings and server errors to PostHog. They carry no user id.

**Product analytics.** When you use the dashboard, our server records what you do in it: signing up, creating a workspace, adding or removing a connection, creating or removing a product, assigning costs to products, and starting or completing a checkout. We tie these events to your user id and workspace id, never to your name or email, and they contain no amounts, keys or data from your providers. Once a day we also record, for each workspace, its plan, base currency, creation date, and how many members, products and connections per provider it has. We send both to PostHog. You can switch off **Product analytics** in Settings, and we stop recording your events. The daily workspace counts continue, because they describe how the workspace is set up rather than what you do.

**Web analytics without cookies.** On every page, PostHog counts your visit without cookies or other storage on your device: the pages you view, the buttons you click but not their text, errors in the page, and your browser and device type. To count unique visitors, PostHog's servers combine your IP address and user agent with a random value that changes every day, and keep only the resulting hash. PostHog deletes each day's random value once it has processed that day's events. After that the hash can't be linked back to your IP address, and you count as a new visitor each day.

**Cookies and session replay, only if you accept.** If you accept in the cookie banner, PostHog sets cookies that recognize your browser across visits, records session replays, and may derive your approximate location from your IP address. In the dashboard it also links your browser's activity to your user id. Session replays record the page layout and your mouse and scroll movements. They hide everything you type; in the dashboard they hide all text, and on the public site every digit. Replays leave out network request and response bodies and console output. If you decline, PostHog sets no cookies and records no replays.

**Cookies.** Cookies keep you signed in and remember your workspace, your theme and your cookie choice. PostHog's cookies arrive only after you accept. The [Cookie Policy](/cookies) lists each one. No advertising or cross-site cookies.

**Emails you send us.** Support messages and their content.

## 2. How we use it

- To run the Service: sign you in, sync your connections, compute figures, send alerts and the weekly email you asked for.
- To bill paid plans through Polar.
- To keep the Service secure and to debug problems.
- To see which features people use and where they get stuck, so we know what to fix. Session replays add to this only if you accept them.
- To tell you about changes to the Service, these terms or pricing. These are service messages, not marketing. We do not send marketing email unless you opt in, and you can opt out at any time.
- To produce aggregate statistics that do not identify anyone, such as how many workspaces use a given connector.

Under the GDPR, our legal bases are performance of our contract with you, our legitimate interest in running, securing and improving the Service, and consent where we ask for it. Product analytics and web analytics without cookies rely on our legitimate interest in improving the Service. You can switch off product analytics in Settings, and object to web analytics by emailing us. Cookies and session replay rely on your consent.

## 3. Who we share it with

We do not sell personal information and we do not share it with advertisers. We share it only with the services that run OpenProfit:

| Service | Purpose | Location |
| --- | --- | --- |
| Railway | Hosting and database | United States |
| Polar Software Inc. | Payments, invoices, tax, as merchant of record | United States and EU |
| Resend | Sending sign-in links, alerts and the weekly email | United States |
| PostHog Inc. | Product analytics, web analytics without cookies, and cookies and session replay if you accept them; server logs and error reports | United States |
| Google, GitHub | Sign-in, if you choose them | United States |
| Frankfurter (European Central Bank data) | Exchange rates; receives no personal data | EU |

When we send browser analytics through PostHog's managed reverse proxy, the requests pass through Cloudflare, Inc., which PostHog lists as its subprocessor for that service.

Each provider you connect receives API calls from us using your credential. Those calls contain nothing about you beyond the credential itself.

We may also disclose information when the law requires it, to enforce our terms, or to protect the rights and safety of users or the public. If we sell or transfer the business, your information may transfer with it under this policy.

## 4. Where data lives

The Service runs on servers in the United States. If you are in Canada, the European Economic Area, the United Kingdom or Switzerland, your information is transferred there. For transfers from the EEA, UK and Switzerland we rely on standard contractual clauses with our subprocessors.

## 5. Telemetry from self-hosted copies

A self-hosted copy of the open-source software sends us nothing by default. If its owner switches on the usage ping, it sends once a day: a hashed instance id that cannot be reversed, the software version, and counts of workspaces, products and connections per provider. No names, emails, amounts or keys. We use it to know which connectors matter and which versions are in use.

## 6. How long we keep it

- Account and workspace data: while your workspace exists, then deleted within 30 days of a deletion request.
- Backups: cycle out within 90 days.
- Server logs: 30 days.
- Session replays: 30 days.
- Analytics events and error reports: as long as PostHog keeps events on our plan, which is 1 year on its free plan and 7 years on paid plans. We delete yours on request.
- Billing records: as long as tax law requires, through Polar.
- Support emails: up to two years.

## 7. Security

Credentials are encrypted with AES-256-GCM. Traffic is encrypted in transit. Access to production systems is limited to the people who run the Service. No system is perfectly secure; if we learn of a breach that affects you, we will tell you and the authorities as the law requires.

## 8. Your rights

Depending on where you live, you may have the right to access, correct, export or delete your personal information, to object to or restrict some processing, to withdraw consent, and to complain to a supervisory authority. In Canada this includes rights under PIPEDA and Quebec's Act respecting the protection of personal information in the private sector; in the EEA and UK, rights under the GDPR; in California, rights under the CCPA.

You can do most of this yourself: edit the workspace in Settings, remove connections and products, and delete the workspace. To withdraw consent to cookies and session replay, use **Cookie settings** in the site footer or the **Replay and cookies** row in Settings. To object to product analytics, switch off the **Product analytics** row in Settings. For anything else, email hello@openprofit.dev. We respond within 30 days and may ask you to confirm your identity first.

Quebec residents: the person in charge of the protection of personal information is the operator named above, reachable at the same address.

## 9. Children

The Service is not directed at anyone under 18, and we do not knowingly collect their information.

## 10. Changes

We may update this policy. We will post the new version at openprofit.dev/privacy with a new date, and for material changes we will email you or show a notice in the Service before they take effect.

## 11. Contact

hello@openprofit.dev
