type Props = {
	children: React.ReactNode;
};

export function SidebarContainer({ children }: Props) {
	return (
		<div className="relative flex w-full flex-col gap-2 px-2 py-2">
			{children}
		</div>
	);
}
