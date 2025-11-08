import * as React from "react";
import { useSupportConfig } from "../support/store/support-store";
import { useRenderElement } from "../utils/use-render-element";

export type WindowRenderProps = {
	isOpen: boolean;
	close: () => void;
};

export type WindowProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: React.ReactNode | ((props: WindowRenderProps) => React.ReactNode);
	asChild?: boolean;
	closeOnEscape?: boolean;
	id?: string;
};

/**
 * Dialog container with open/close state and escape key handling.
 *
 * @example
 * <Window isOpen={isOpen} onOpenChange={setOpen}>
 *   {({ isOpen, close }) => (
 *     <div>Content here</div>
 *   )}
 * </Window>
 */
export const SupportWindow = (() => {
	const Component = React.forwardRef<HTMLDivElement, WindowProps>(
		(
			{
				isOpen: isOpenProp,
				onOpenChange,
				children,
				className,
				asChild = false,
				closeOnEscape = true,
				id = "cossistant-window",
				...props
			},
			ref
		) => {
			const { isOpen, close } = useSupportConfig();

			const open = isOpenProp ?? isOpen ?? false;

			const closeFn = React.useCallback(() => {
				if (onOpenChange) {
					onOpenChange(false);
				} else if (close) {
					close();
				}
			}, [onOpenChange, close]);

			// Close on Escape
			React.useEffect(() => {
				if (!(open && closeOnEscape)) {
					return;
				}
				const onKey = (e: KeyboardEvent) => {
					if (e.key === "Escape") {
						close();
					}
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [open, close, closeOnEscape]);

			const renderProps: WindowRenderProps = { isOpen: open, close: closeFn };

			const content =
				typeof children === "function" ? children(renderProps) : children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					state: renderProps,
					props: {
						role: "dialog",
						"aria-modal": "true",
						id,
						...props,
						children: content,
					},
					enabled: open,
				}
			);
		}
	);

	Component.displayName = "SupportWindow";
	return Component;
})();
