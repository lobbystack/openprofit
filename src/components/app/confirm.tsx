import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";

type Ask = { title: string; description: string; action: string };

// `await confirm({...})` resolves true when the person confirms. Render
// `dialog` once in the component that asks.
export function useConfirm() {
	const [ask, setAsk] = useState<
		(Ask & { resolve: (ok: boolean) => void }) | null
	>(null);
	const answer = (ok: boolean) => {
		ask?.resolve(ok);
		setAsk(null);
	};
	const confirm = (a: Ask) =>
		new Promise<boolean>((resolve) => setAsk({ ...a, resolve }));
	const dialog = (
		<AlertDialog open={!!ask} onOpenChange={(open) => !open && answer(false)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{ask?.title}</AlertDialogTitle>
					<AlertDialogDescription>{ask?.description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={() => answer(true)}>
						{ask?.action}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
	return [confirm, dialog] as const;
}
