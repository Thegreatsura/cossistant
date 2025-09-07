import { InboxNavigationSidebar } from "@/components/ui/layout/sidebars/navigation/inbox-navigation-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InboxNavigationSidebar />
      {children}
    </>
  );
}
