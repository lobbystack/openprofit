import { Calendar } from "lucide-react";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { PERIODS, type PeriodKey } from "#/lib/overview";

// The period picker in the Overview and Costs headers.
export function PeriodSelect({
	value,
	onChange,
}: {
	value: PeriodKey;
	onChange: (period: PeriodKey) => void;
}) {
	return (
		<label className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 text-[13px] hover:border-line-strong">
			<Calendar size={13} className="text-text-3" />
			<NativeSelect
				variant="bare"
				aria-label="Period"
				value={value}
				onChange={(e) => onChange(e.target.value as PeriodKey)}
			>
				{PERIODS.map((p) => (
					<NativeSelectOption key={p.key} value={p.key}>
						{p.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</label>
	);
}
