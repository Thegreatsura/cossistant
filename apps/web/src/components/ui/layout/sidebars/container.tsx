import { SidebarItem } from "./sidebar-item";

type Props = {
	children: React.ReactNode;
	footer?: React.ReactNode;
};

export function SidebarContainer({ children, footer }: Props) {
	return (
		<div className="relative flex w-full flex-col gap-1 px-2 py-2">
			<div className="flex flex-1 flex-col gap-1">{children}</div>
			{footer}
		</div>
	);
}
