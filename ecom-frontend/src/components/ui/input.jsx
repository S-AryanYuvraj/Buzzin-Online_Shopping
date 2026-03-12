import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                "flex h-9 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    );
}
