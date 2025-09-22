type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function SidebarContainer({ children, footer }: Props) {
  return (
    <div className="relative flex w-full flex-col gap-2 px-2 py-2">
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}
