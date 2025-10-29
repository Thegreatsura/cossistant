import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";

export function FakeInbox() {
  return (
    <FakeInboxNavigationSidebar
      activeView="inbox"
      open
      statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
    />
  );
}
