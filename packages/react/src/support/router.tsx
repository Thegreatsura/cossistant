import type React from "react";
import { ArticlesPage } from "./pages/articles";
import { ConversationPage } from "./pages/conversation";
import { ConversationHistoryPage } from "./pages/conversation-history";
import { HomePage } from "./pages/home";
import { useSupportNavigation } from "./store/support-store";

export const SupportRouter: React.FC<{
	message: string;
	files: File[];
	isSubmitting: boolean;
	error: Error | null;
	setMessage: (message: string) => void;
	addFiles: (files: File[]) => void;
	removeFile: (index: number) => void;
	submit: () => void;
}> = ({
	message,
	files,
	isSubmitting,
	error,
	setMessage,
	addFiles,
	removeFile,
	submit,
}) => {
	const { current } = useSupportNavigation();

	switch (current.page) {
		case "HOME":
			return <HomePage />;

		case "ARTICLES":
			return <ArticlesPage />;

		case "CONVERSATION":
			return (
				<ConversationPage
					addFiles={addFiles}
					conversationId={current.params.conversationId}
					error={error}
					events={[]}
					files={files}
					isSubmitting={isSubmitting}
					message={message}
					removeFile={removeFile}
					setMessage={setMessage}
					submit={submit}
				/>
			);

		case "CONVERSATION_HISTORY":
			return <ConversationHistoryPage />;

		default: {
			return <HomePage />;
		}
	}
};
