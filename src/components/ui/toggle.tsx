import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// Tuned to the design system. `tile` is the overview's metric tile: a block
// that tints when picked and carries an ink underline (rendered by the
// caller). Focus rings and press feedback come from styles.css.
const toggleVariants = cva(
	"group/toggle inline-flex items-center justify-center whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"gap-1 rounded-md text-[13px] text-text-2 hover:text-ink data-pressed:bg-surface-2 data-pressed:text-ink",
				outline:
					"gap-1 rounded-md border border-line text-[13px] hover:border-line-strong data-pressed:bg-surface-2",
				tile: "relative flex-col items-stretch text-left transition-colors duration-150 hover:bg-surface-2/60 data-pressed:bg-surface-2",
			},
			size: {
				default: "h-8 min-w-8 px-2.5",
				sm: "h-7 min-w-7 px-2 text-[12px]",
				tile: "px-5 py-4",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Toggle({
	className,
	variant = "default",
	size = "default",
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
