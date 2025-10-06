import { SidebarItem } from "./sidebar-item";

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  basePath: string;
};

export function SidebarContainer({ children, footer, basePath }: Props) {
  return (
    <div className="relative flex w-full flex-col gap-2 px-2 py-2">
      <div className="flex flex-1 flex-col gap-1">{children}</div>
      <SidebarItem href={`${basePath}/archived`} iconName="settings">
        Settings
      </SidebarItem>
      {footer}
    </div>
  );
}
