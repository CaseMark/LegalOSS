import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AppHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function AppHeader({
  title,
  description,
  children,
  className,
  ...props
}: AppHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-2 py-2", className)} {...props}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}





