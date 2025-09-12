import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { useInboxes } from "@/contexts/inboxes";

export function ConversationHeaderNavigation() {
  const {
    previousConversation,
    nextConversation,
    navigateToPreviousConversation,
    navigateToNextConversation,
    goBack,
    statusCounts,
    selectedConversationIndex,
  } = useInboxes();

  return (
    <div className="flex items-center gap-4">
      <Button
        className="size-6 rounded-md"
        onClick={goBack}
        size="icon"
        variant="ghost"
      >
        <Icon name="arrow-left" />
      </Button>
      <div className="flex items-center gap-2">
        <Button
          className="size-6 rounded-md"
          disabled={!previousConversation}
          onClick={navigateToPreviousConversation}
          size="icon"
          variant="outline"
        >
          <Icon className="rotate-90" name="arrow-left" />
        </Button>
        <Button
          className="size-6 rounded-md"
          disabled={!nextConversation}
          onClick={navigateToNextConversation}
          size="icon"
          variant="outline"
        >
          <Icon className="rotate-90" name="arrow-right" />
        </Button>
      </div>
      <div className="flex gap-0.5 text-primary/40 text-sm">
        <span className="text-primary/90">{selectedConversationIndex + 1}</span>
        <span>/</span>
        <span>{statusCounts.open}</span>
      </div>
    </div>
  );
}
