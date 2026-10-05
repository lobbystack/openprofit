import { APP_NAME } from "#/lib/app";

// Sends through Resend when RESEND_API_KEY is set; otherwise prints the
// message to the server log, which is how self-host and local dev work.
export async function sendEmail(to: string, subject: string, text: string) {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.log(`\n[${APP_NAME}] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
		return;
	}
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@example.com>`,
			to,
			subject,
			text,
		}),
	});
	if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
