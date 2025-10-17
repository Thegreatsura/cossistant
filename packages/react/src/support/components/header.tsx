import { useSupportConfig } from "../store";
import { cn } from "../utils";
import { Button } from "./button";
import Icon from "./icons";

export type HeaderProps = {
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onGoBack?: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  className,
  children,
  actions,
  onGoBack,
}) => {
  const { close, mode } = useSupportConfig();

  return (
    <div className={cn("absolute inset-x-0 top-0 z-10 h-18", className)}>
      <div className="absolute inset-0 z-10 flex items-center justify-between gap-3 px-4">
        <div className="flex flex-1 items-center gap-3">
          {onGoBack && (
            <Button
              onClick={onGoBack}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Icon name="arrow-left" />
            </Button>
          )}
          {children}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {mode !== "responsive" && (
          <Button onClick={close} size="icon" type="button" variant="ghost">
            <Icon name="close" />
          </Button>
        )}
      </div>
    </div>
  );
};
