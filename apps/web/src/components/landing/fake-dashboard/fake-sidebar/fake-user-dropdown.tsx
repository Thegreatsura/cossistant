import { Avatar } from "@/components/ui/avatar";

type FakeUserDropdownProps = {
  websiteSlug: string;
  user: {
    name: string;
    email: string;
    image: string;
  };
};

export function FakeUserDropdown({ user }: FakeUserDropdownProps) {
  return (
    <button
      className="group flex items-center gap-2.5 rounded px-3 py-2.5 text-left text-primary/80 text-sm hover:cursor-pointer hover:bg-background-200 hover:text-primary disabled:opacity-50 dark:hover:bg-background-300"
      disabled={!user}
      type="button"
    >
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate">{user.name}</span>
      </div>
      <Avatar className="size-5" fallbackName={user.name} url={user.image} />
    </button>
  );
}

export default FakeUserDropdown;
