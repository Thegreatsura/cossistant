import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
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

  // keyboard shortcuts for back, previous and next conversation
  useHotkeys(
    ["escape", "j", "k"],
    (_, handler) => {
      switch (handler.keys?.join("")) {
        case "escape":
          goBack();
          break;
        case "j":
          if (previousConversation) {
            navigateToPreviousConversation();
          }
          break;
        case "k":
          if (nextConversation) {
            navigateToNextConversation();
          }
          break;
        default:
          break;
      }
    },
    {
      preventDefault: true,
      enableOnContentEditable: false,
      enableOnFormTags: false,
    },
  );

  return (
    <div className="flex items-center gap-4">
      <TooltipOnHover content="Go back" shortcuts={["Esc"]}>
        <Button onClick={goBack} size="icon-small" variant="ghost">
          <Icon name="arrow-left" />
        </Button>
      </TooltipOnHover>
      <div className="flex items-center gap-2">
        <TooltipOnHover content="Previous conversation" shortcuts={["j"]}>
          <Button
            disabled={!previousConversation}
            onClick={navigateToPreviousConversation}
            size="icon-small"
            variant="outline"
          >
            <Icon className="rotate-90" name="arrow-left" />
          </Button>
        </TooltipOnHover>
        <TooltipOnHover content="Next conversation" shortcuts={["k"]}>
          <Button
            disabled={!nextConversation}
            onClick={navigateToNextConversation}
            size="icon-small"
            variant="outline"
          >
            <Icon className="rotate-90" name="arrow-right" />
          </Button>
        </TooltipOnHover>
      </div>
      <div className="flex gap-0.5 text-primary/40 text-sm">
        <span className="text-primary/90">{selectedConversationIndex + 1}</span>
        <span>/</span>
        <span>{statusCounts.open}</span>
      </div>
    </div>
  );
}
