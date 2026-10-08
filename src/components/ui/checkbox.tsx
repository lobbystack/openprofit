import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

// 16px box with a hairline border, ink when checked. Focus comes from the
// global rule in styles.css; the hit area reaches past the box.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-line-strong bg-paper after:absolute after:-inset-x-3 after:-inset-y-2 data-checked:border-ink data-checked:bg-ink data-checked:text-paper data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-content-center text-current [&>svg]:size-3"
			>
				<CheckIcon strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
