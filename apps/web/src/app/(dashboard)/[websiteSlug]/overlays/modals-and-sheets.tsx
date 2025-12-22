"use client";

import { parseAsString, useQueryState } from "nuqs";
import { ContactSheetWrapper } from "./sheets/contact-sheet-wrapper";

/**
 * Global overlays orchestrator for the dashboard.
 *
 * This component listens to URL parameters via nuqs and renders
 * the appropriate sheet or modal. Add new overlays by:
 * 1. Creating a wrapper component in ./sheets/ or ./modals/
 * 2. Adding a new useQueryState hook for the URL param
 * 3. Conditionally rendering the wrapper based on the param
 */
export function ModalsAndSheets() {
	const [contactId, setContactId] = useQueryState("contact", parseAsString);

	const handleContactSheetClose = () => {
		void setContactId(null);
	};

	return (
		<>
			{/* Contact Sheet */}
			{contactId && (
				<ContactSheetWrapper
					contactId={contactId}
					onClose={handleContactSheetClose}
				/>
			)}

			{/* Add more sheets/modals here as needed */}
		</>
	);
}
