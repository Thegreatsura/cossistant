import type { PublicVisitor, VisitorMetadata } from "@cossistant/types";
import { useSupport } from "../..";

export interface UseVisitorReturn {
	visitor: PublicVisitor | null;
	setVisitorMetadata: (metadata: VisitorMetadata) => void;
}

export function useVisitor(): UseVisitorReturn {
	const { website } = useSupport();
	const visitor = website?.visitor || null;

	return {
		visitor,
		setVisitorMetadata: () => {
			console.warn(
				"useVisitor setVisitor is not implemented - visitor is managed by website context"
			);
		},
	};
}
