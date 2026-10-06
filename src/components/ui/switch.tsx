import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

// 36×20 track, ink when on, the thumb slides on the standard ease-out curve.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 data-checked:bg-ink data-unchecked:bg-line-strong data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="size-4 rounded-full bg-paper transition-transform duration-150 ease-(--ease-out) data-checked:translate-x-4"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
