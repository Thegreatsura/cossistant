/** biome-ignore-all lint/correctness/useExhaustiveDependencies: wanted here */

import type { VisitorMetadata } from "@cossistant/types";
import { type ReactElement, useEffect, useState } from "react";
import { useVisitor } from "./hooks";
import { computeMetadataHash } from "./utils/metadata-hash";

export type IdentifySupportVisitorProps = {
	externalId?: string;
	email?: string;
	name?: string | null;
	image?: string | null;
	metadata?: VisitorMetadata | null;
};

/**
 * Component exposed by Cossistant allowing you to identify a visitor whenever rendered with either an `externalId` or `email`. Once identified, the visitor will be associated with a contact and any subsequent metadata updates will be attached to this contact.
 */
export const IdentifySupportVisitor = ({
	externalId,
	email,
	name,
	image,
	metadata: _newMetadata,
}: IdentifySupportVisitorProps): ReactElement | null => {
	const { visitor, identify, setVisitorMetadata } = useVisitor();
	const [hasIdentified, setHasIdentified] = useState(false);
	const [lastMetadataHash, setLastMetadataHash] = useState<string | null>(null);

	// Only call identify if:
	// 1. Visitor hasn't been identified yet (no contact)
	// 2. Name, email, or image changed compared to current contact
	useEffect(() => {
		const shouldIdentify = async () => {
			const hasIdentificationData = Boolean(externalId || email);

			// Need at least externalId or email to identify
			if (!hasIdentificationData) {
				return;
			}

			// Case 1: No contact exists yet
			if (!visitor?.contact) {
				if (!hasIdentified) {
					await identify({
						externalId,
						email,
						name: name ?? undefined,
						image: image ?? undefined,
					});
					setHasIdentified(true);
				}
				return;
			}

			// Case 2: Contact exists but name/email/image changed
			const contact = visitor.contact;
			const nameChanged = name !== undefined && name !== contact.name;
			const emailChanged = email !== undefined && email !== contact.email;
			const imageChanged = image !== undefined && image !== contact.image;
			const hasChanges = nameChanged || emailChanged || imageChanged;

			if (hasChanges) {
				await identify({
					externalId,
					email,
					name: name ?? undefined,
					image: image ?? undefined,
				});
			}
		};

		shouldIdentify();
	}, [
		visitor?.contact,
		externalId,
		email,
		name,
		image,
		identify,
		hasIdentified,
	]);

	// Compute metadata hash, compare to previous hash and only update if it has changed
	useEffect(() => {
		const updateMetadata = async () => {
			// Skip if no metadata provided or visitor doesn't have a contact
			if (!_newMetadata) {
				return;
			}

			if (!visitor?.contact) {
				return;
			}

			// Compute new metadata hash
			const newMetadataHash = await computeMetadataHash(_newMetadata);

			// Get the existing hash from the contact
			const existingHash = visitor.contact.metadataHash || "";

			// Only update if hashes don't match and we haven't already updated with this hash
			const hashChanged = newMetadataHash !== existingHash;
			const notAlreadyUpdated = newMetadataHash !== lastMetadataHash;
			const shouldUpdate = Boolean(
				newMetadataHash && hashChanged && notAlreadyUpdated
			);

			if (shouldUpdate) {
				await setVisitorMetadata(_newMetadata);
				setLastMetadataHash(newMetadataHash);
			}
		};

		updateMetadata();
	}, [
		_newMetadata,
		visitor?.contact?.metadataHash,
		visitor?.contact,
		setVisitorMetadata,
		lastMetadataHash,
	]);

	return null;
};

IdentifySupportVisitor.displayName = "IdentifySupportVisitor";
