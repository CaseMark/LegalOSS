import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronDown, type LucideIcon } from 'lucide-react';

const toolCallPillVariants = cva(
  'flex w-full flex-row items-start justify-between gap-3 rounded-xl border bg-background px-3 py-2 transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border',
        primary: 'border-primary/20 bg-primary/5',
        success: 'border-green-500/20 bg-green-500/5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const iconVariants = cva('mt-1 shrink-0 transition-colors', {
  variants: {
    status: {
      loading: 'text-muted-foreground',
      complete: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    status: 'loading',
  },
});

const statusIconVariants = cva('mt-1 shrink-0 transition-all duration-300', {
  variants: {
    status: {
      loading: 'animate-spin text-muted-foreground',
      complete: 'text-muted-foreground scale-110',
    },
  },
  defaultVariants: {
    status: 'loading',
  },
});

export interface ToolCallPillProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'>,
    VariantProps<typeof toolCallPillVariants> {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  status?: 'loading' | 'complete';
  tooltipText?: string;
  isOpen?: boolean;
  showChevron?: boolean;
}

const ToolCallPill = React.forwardRef<HTMLButtonElement, ToolCallPillProps>(
  (
    {
      className,
      variant,
      icon: Icon,
      title,
      subtitle,
      status = 'loading',
      tooltipText,
      isOpen = false,
      showChevron = false,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        title={tooltipText}
        className={cn(toolCallPillVariants({ variant }), className)}
        {...props}
      >
        <div className="flex min-w-0 flex-1 flex-row items-start gap-3">
          <Icon size={16} className={iconVariants({ status })} />
          <div className="min-w-0 flex-1 text-left">
            <div className="break-words font-medium text-sm leading-tight">{title}</div>
            {subtitle && (
              <div className="mt-0.5 break-words text-muted-foreground text-xs leading-tight">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showChevron && (
            <ChevronDown
              size={16}
              className={cn(
                'shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          )}
          <div className={statusIconVariants({ status })}>
            {status === 'loading' ? <Loader2 size={16} /> : <Check size={16} />}
          </div>
        </div>
      </button>
    );
  },
);

ToolCallPill.displayName = 'ToolCallPill';

export { ToolCallPill, toolCallPillVariants };

