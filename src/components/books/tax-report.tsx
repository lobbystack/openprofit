import { Card } from "#/components/ui/card";
import type { getTaxReport } from "#/server/tax.functions";

// Stub: the tax work fills this in.
export function TaxReport(_: {
	report: Awaited<ReturnType<typeof getTaxReport>>;
}) {
	return <Card className="p-4 text-[13px] text-text-2">Tax report</Card>;
}
