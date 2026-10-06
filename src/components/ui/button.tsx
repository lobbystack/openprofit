import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// Tuned to the design system: no shadows, ink hovers, and press feedback and
// focus rings from the global rules in styles.css (`pressable` covers links
// rendered through `render`).
const buttonVariants = cva(
	"pressable inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-ink text-paper hover:bg-ink-2",
				outline:
					"border border-line bg-paper text-ink hover:border-line-strong",
				ghost: "text-text-2 hover:text-ink",
				destructive: "bg-negative text-paper hover:bg-negative/90",
				// Icon buttons in rows: muted until hovered.
				quiet: "text-text-3 hover:bg-surface-2 hover:text-ink",
				"quiet-destructive":
					"text-text-3 hover:bg-surface-2 hover:text-negative",
				// Landing call-to-action band.
				paper:
					"bg-paper text-ink hover:bg-surface-2 dark:bg-ink dark:text-paper dark:hover:bg-ink-2",
				translucent:
					"bg-paper/20 text-paper hover:bg-paper/30 dark:bg-ink/10 dark:text-ink dark:hover:bg-ink/15",
			},
			size: {
				xs: "h-7 px-2.5 text-[12px]",
				sm: "h-8 px-3 text-[13px]",
				default: "h-9 px-3 text-[13px]",
				lg: "h-[38px] px-5 text-[14px]",
				"icon-sm": "size-7",
				icon: "size-8",
			},
			// Marketing buttons are medium weight; app buttons are regular.
			weight: {
				regular: "",
				medium: "font-medium",
			},
		},
		// Bordered controls sit a little tighter than filled buttons.
		compoundVariants: [
			{ variant: "outline", size: "sm", class: "px-2.5" },
			{ variant: "ghost", size: "sm", class: "px-2" },
		],
		defaultVariants: {
			variant: "default",
			size: "sm",
			weight: "regular",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "sm",
	weight = "regular",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, weight, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
