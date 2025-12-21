/** biome-ignore-all lint/suspicious/noExplicitAny: works well here */
/** biome-ignore-all lint/nursery/noUnnecessaryConditions: ok */

import type { JSX } from "react";
import * as React from "react";
import { mergeRefs } from "./merge-refs";

type IntrinsicTag = keyof JSX.IntrinsicElements;

type ClassName<State> = string | ((state: State) => string);

type RenderFn<Props, State> = (
	props: Props,
	state: State
) => React.ReactElement;

type RenderProps<State, Tag extends IntrinsicTag> = {
	render?: React.ReactElement | RenderFn<JSX.IntrinsicElements[Tag], State>;
	className?: ClassName<State>;
	asChild?: boolean;
};

type RenderParams<State, Tag extends IntrinsicTag> = {
	state?: State;
	ref?: React.Ref<any>;
	props?: Partial<JSX.IntrinsicElements[Tag]>;
	enabled?: boolean;
};

type SlotProps = {
	children: React.ReactElement;
	[key: string]: any;
};

/**
 * Slot component that properly forwards refs when using asChild pattern.
 * Uses forwardRef to receive the ref and merges it with any existing ref on the child.
 */
const Slot = React.forwardRef<HTMLElement, SlotProps>(
	({ children, ...props }, forwardedRef) => {
		// Get the child's existing ref (if any)
		const childRef = (children as any).ref;

		// Merge the forwarded ref with the child's ref
		const mergedRef = mergeRefs([forwardedRef, childRef]);

		return React.cloneElement(children, {
			...props,
			ref: mergedRef,
			className: [(children.props as any).className, props.className]
				.filter(Boolean)
				.join(" "),
		} as any);
	}
);

/**
 * Utility hook to support slot-style component overrides.
 */
export function useRenderElement<
	State extends Record<string, any>,
	Tag extends IntrinsicTag,
>(
	tag: Tag,
	componentProps: RenderProps<State, Tag>,
	params?: RenderParams<State, Tag>
): React.ReactElement | null {
	const { render, className: classNameProp, asChild = false } = componentProps;

	const {
		state = {} as State,
		ref,
		props = {} as Partial<JSX.IntrinsicElements[Tag]>,
		enabled = true,
	} = params || {};

	if (!enabled) {
		return null;
	}

	const computedClassName =
		typeof classNameProp === "function" ? classNameProp(state) : classNameProp;

	const mergedProps = {
		...props,
		className: [props.className, computedClassName].filter(Boolean).join(" "),
		ref,
	};

	if (typeof render === "function") {
		return render(mergedProps as JSX.IntrinsicElements[Tag], state);
	}

	if (React.isValidElement(render)) {
		return React.cloneElement(render, {
			...mergedProps,
			ref: (render as any).ref || ref,
		});
	}

	if (asChild && React.isValidElement(props.children)) {
		// Extract ref to pass explicitly to the forwardRef Slot component
		// React extracts ref from spread props, so we must pass it separately
		const { ref: slotRef, ...restMergedProps } = mergedProps;
		return (
			<Slot ref={slotRef} {...restMergedProps}>
				{props.children}
			</Slot>
		);
	}

	return React.createElement(tag, mergedProps as any);
}
