import { Card } from "#/components/ui/card";
import type { getBooksSettings } from "#/server/books-settings.functions";

// Stub: the settings work fills this in.
export function BooksSettings(_: {
	settings: Awaited<ReturnType<typeof getBooksSettings>>;
}) {
	return <Card className="p-4 text-[13px] text-text-2">Settings</Card>;
}
