// Turns a connector error into a sentence for people. Errors from a provider's
// API start with the HTTP status ("401 Unauthorized: {...}"); the raw text
// becomes `detail`. Errors OpenProfit wrote itself are already sentences.
export function describeError(
	provider: string,
	message: string,
): { text: string; detail: string | null } {
	const status = Number(/^(\d{3})\b/.exec(message)?.[1]);
	if (status) {
		const text =
			status === 401 || status === 403
				? `${provider} rejected the key. Check that it's still valid and has the permissions the setup guide lists.`
				: status === 404
					? `${provider} couldn't find the account for this key. Check any ids you entered.`
					: status === 429
						? `${provider} is limiting requests. Try again in a few minutes.`
						: status >= 500
							? `${provider} had a server error. Try again in a few minutes.`
							: `${provider} returned an error (${status}).`;
		return { text, detail: message };
	}
	if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|ECONNREFUSED/.test(message))
		return {
			text: `Couldn't reach ${provider}. Try again in a few minutes.`,
			detail: message,
		};
	return { text: message, detail: null };
}
