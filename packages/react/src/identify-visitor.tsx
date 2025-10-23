/** biome-ignore-all lint/correctness/useExhaustiveDependencies: wanted here */
import { useEffect, type ReactElement } from "react";
import { useVisitor } from "./hooks";

export type IdentifySupportVisitorProps = {
	externalId?: string;
	email?: string;
};

/**
 * Component exposed by Cossistant allowing you to identify a visitor whenever rendered with either an `externalId` or `email`.
 */
export const IdentifySupportVisitor = ({
	externalId,
	email,
}: IdentifySupportVisitorProps): ReactElement | null => {
	const { visitor, identify } = useVisitor();

	// Only update when the arrays actually change content
	useEffect(() => {
		if (!visitor?.contact && (externalId || email)) {
			identify({ externalId, email });
		}
	}, [visitor?.contact, externalId, email]);

	return null;
};

IdentifySupportVisitor.displayName = "IdentifySupportVisitor";
