import { cn } from "cn";
import type * as React from "react";

// Hairline border that darkens on focus, no shadow. 36px by default, 32px at
// size="sm" (settings rows and inline forms).
function Input({
	className,
	type,
	size = "default",
	...props
}: Omit<React.ComponentProps<"input">, "size"> & { size?: "sm" | "default" }) {
	return (
		<input
			type={type}
			data-slot="input"
			data-size={size}
			className={cn(
				"h-9 w-full min-w-0 rounded-md border border-line bg-paper px-3 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-negative data-[size=sm]:h-8 data-[size=sm]:px-2.5",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
