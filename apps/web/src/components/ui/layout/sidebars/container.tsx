type Props = {
	children: React.ReactNode;
};

export function SidebarContainer({ children }: Props) {
	return <div className="relative flex w-full flex-col pt-16">{children}</div>;
}
