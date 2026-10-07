# Privacy Policy

Last updated: October 6, 2026. Added section 6, Benchmarks.

This policy explains what personal information OpenProfit collects, why, and what you can do about it. OpenProfit is operated by Lobbystack Inc., Montreal, Quebec, Canada ("we", "us"). It covers the hosted service at openprofit.dev. If you run the open-source software on your own server, we receive nothing from it unless you switch on the usage ping described in section 5.

## 1. What we collect

**Account information.** Your email address, and if you sign in with Google or GitHub, the name, email and avatar they share with us. We never see your password for those services.

**Workspace information.** The workspace name, base currency, products you create, and the settings you choose.

**Provider credentials.** The API keys and tokens you give us to connect a provider. They are encrypted at rest with a key that is not stored with the data, and decrypted only to call that provider.

**Financial data from providers.** Transactions, fees, refunds, subscriptions, customer counts and usage charges that the providers you connect report to us. This can include your customers' transaction amounts and dates. It does not include your customers' names, emails or card details; we do not request those fields.

**Billing.** If you pay for a plan, Polar Software Inc. collects your name, email, billing address and payment details as merchant of record. We receive your email, the plan, and the subscription status. We do not receive card numbers.

**Usage and technical data.** Server logs with IP address, browser and request details, kept for 30 days for security and debugging. We send server logs, request timings and server errors to PostHog. They carry no user id.

**Product analytics.** When you use the dashboard, our server records what you do in it: signing up, creating a workspace, adding or removing a connection, creating or removing a product, assigning costs to products, and starting or completing a checkout. We tie these events to your user id and workspace id, never to your name or email, and they contain no amounts, keys or data from your providers. Once a day we also record, for each workspace, its plan, base currency, creation date, and how many members, products and connections per provider it has. We send both to PostHog. You can switch off **Analytics** in Settings, and we stop recording your events. The daily workspace counts continue, because they describe how the workspace is set up rather than what you do.

**Web analytics without cookies.** PostHog never sets cookies or stores anything else on your device. Unless you're signed in with Analytics on, it counts your visit anonymously: the pages you view, the buttons you click but not their text, errors in the page, and your browser and device type. To count unique visitors, PostHog's servers combine your IP address and user agent with a random value that changes every day, and keep only the resulting hash. PostHog deletes each day's random value once it has processed that day's events. After that the hash can't be linked back to your IP address, and you count as a new visitor each day.

**Session replay, while Analytics is on.** Your account has an **Analytics** switch in Settings, on until you turn it off. While it's on and you're signed in, PostHog links the pages you view and the buttons you click to your user id, records session replays of the dashboard, and may derive your approximate location from your IP address. It keeps the session id in the page's memory, so reloading the page starts a new session. Session replays record the page layout and your mouse and scroll movements. They hide everything you type and all text. Replays leave out network request and response bodies and console output. PostHog records no replays of the public site. When you turn Analytics off or sign out, PostHog goes back to counting your visits anonymously.

**Cookies.** Cookies keep you signed in and remember your workspace and your theme. PostHog sets none. The [Cookie Policy](/cookies) lists each one. No advertising or cross-site cookies.

**Emails you send us.** Support messages and their content.

## 2. How we use it

- To run the Service: sign you in, sync your connections, compute figures, send alerts and the weekly email you asked for.
- To bill paid plans through Polar.
- To keep the Service secure and to debug problems.
- To see which features people use and where they get stuck, so we know what to fix. Session replays add to this while your Analytics switch is on.
- To tell you about changes to the Service, these terms or pricing. These are service messages, not marketing. We do not send marketing email unless you opt in, and you can opt out at any time.
- To produce aggregate statistics that do not identify anyone, such as how many workspaces use a given connector, and the benchmarks described in section 6.

Under the GDPR, our legal bases are performance of our contract with you, our legitimate interest in running, securing and improving the Service, and consent where we ask for it. Product analytics, session replay and web analytics without cookies rely on our legitimate interest in improving the Service. You can switch off product analytics and session replay with **Analytics** in Settings, and object to web analytics by emailing us.

## 3. Who we share it with

We do not sell personal information and we do not share it with advertisers. We share it only with the services that run OpenProfit:

| Service | Purpose | Location |
| --- | --- | --- |
| Railway | Hosting and database | United States |
| Polar Software Inc. | Payments, invoices, tax, as merchant of record | United States and EU |
| Resend | Sending sign-in links, alerts and the weekly email | United States |
| PostHog Inc. | Product analytics, web analytics without cookies, and session replay while Analytics is on; server logs and error reports | United States |
| Google, GitHub | Sign-in, if you choose them | United States |
| Frankfurter (European Central Bank data) | Exchange rates; receives no personal data | EU |

When we send browser analytics through PostHog's managed reverse proxy, the requests pass through Cloudflare, Inc., which PostHog lists as its subprocessor for that service.

Each provider you connect receives API calls from us using your credential. Those calls contain nothing about you beyond the credential itself.

We may also disclose information when the law requires it, to enforce our terms, or to protect the rights and safety of users or the public. If we sell or transfer the business, your information may transfer with it under this policy.

## 4. Where data lives

The Service runs on servers in the United States. If you are in Canada, the European Economic Area, the United Kingdom or Switzerland, your information is transferred there. For transfers from the EEA, UK and Switzerland we rely on standard contractual clauses with our subprocessors.

## 5. Telemetry from self-hosted copies

A self-hosted copy of the open-source software sends us nothing by default. If its owner switches on the usage ping, it sends once a day: a hashed instance id that cannot be reversed, the software version, and counts of workspaces, products and connections per provider. No names, emails, amounts or keys. We use it to know which connectors matter and which versions are in use.

## 6. Benchmarks

On the hosted Service, we add each workspace's monthly figures to benchmark cohorts unless someone in the workspace switches off **Benchmarks** in Settings. For each month we use the workspace's revenue, its gross margin, its total costs and its AI provider costs as shares of revenue, and its MRR band. We never include self-hosted copies or the public demo.

We group workspaces by MRR band. For each group of 10 or more we compute the 25th, 50th, 75th and 90th percentiles, and publish only those at openprofit.dev/data as an open dataset under the Creative Commons Attribution 4.0 license (CC BY 4.0), which lets anyone reuse it with credit. The dataset holds no names, emails, workspace ids or figures for any single workspace. We publish nothing until at least 50 workspaces qualify in a month.

When you switch off Benchmarks, we leave the workspace out of every month we compute from then on. Months already published stay as they are. While the switch is off, the overview no longer compares your figures with your band. We rely on our legitimate interest in publishing market statistics; the switch is how you object.

## 7. How long we keep it

- Account and workspace data: while your workspace exists, then deleted within 30 days of a deletion request.
- Backups: cycle out within 90 days.
- Server logs: 30 days.
- Session replays: 30 days.
- Analytics events and error reports: as long as PostHog keeps events on our plan, which is 1 year on its free plan and 7 years on paid plans. We delete yours on request.
- Billing records: as long as tax law requires, through Polar.
- Support emails: up to two years.

## 8. Security

Credentials are encrypted with AES-256-GCM. Traffic is encrypted in transit. Access to production systems is limited to the people who run the Service. No system is perfectly secure; if we learn of a breach that affects you, we will tell you and the authorities as the law requires.

## 9. Your rights

Depending on where you live, you may have the right to access, correct, export or delete your personal information, to object to or restrict some processing, to withdraw consent, and to complain to a supervisory authority. In Canada this includes rights under PIPEDA and Quebec's Act respecting the protection of personal information in the private sector; in the EEA and UK, rights under the GDPR; in California, rights under the CCPA.

You can do most of this yourself: edit the workspace in Settings, and remove connections, products and flat costs. To delete a workspace or your account, email hello@openprofit.dev. To stop product analytics and session replay, switch off **Analytics** in Settings. To leave the benchmarks, switch off **Benchmarks**. For anything else, email hello@openprofit.dev. We respond within 30 days and may ask you to confirm your identity first.

Quebec residents: the person in charge of the protection of personal information is the operator named above, reachable at the same address.

## 10. Children

The Service is not directed at anyone under 18, and we do not knowingly collect their information.

## 11. Changes

We may update this policy. We will post the new version at openprofit.dev/privacy with a new date, and for material changes we will email you or show a notice in the Service before they take effect.

## 12. Contact

hello@openprofit.dev
