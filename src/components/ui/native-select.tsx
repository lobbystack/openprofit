import { cn } from "cn";
import type * as React from "react";

// The browser's own select with the input's border and type, so menus stay
// native on every platform. size="xs" for selects inside table rows;
// variant="bare" for a select set inside another bordered control.
function NativeSelect({
	className,
	size = "default",
	variant = "default",
	...props
}: Omit<React.ComponentProps<"select">, "size"> & {
	size?: "xs" | "sm" | "default";
	variant?: "default" | "bare";
}) {
	return (
		<select
			data-slot="native-select"
			data-size={size}
			data-variant={variant}
			className={cn(
				"outline-none disabled:pointer-events-none disabled:opacity-50",
				variant === "bare"
					? "bg-transparent"
					: "h-9 w-full min-w-0 rounded-md border border-line bg-paper px-3 text-[13px] focus:border-line-strong aria-invalid:border-negative data-[size=sm]:h-8 data-[size=sm]:px-2.5 data-[size=xs]:h-7 data-[size=xs]:px-1.5 data-[size=xs]:text-[12px]",
				className,
			)}
			{...props}
		/>
	);
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
	return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
	return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
