import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                variant === "default" && "bg-primary/20 text-primary",
                variant === "secondary" && "bg-muted text-muted-foreground",
                variant === "destructive" && "bg-destructive/20 text-destructive",
                className
            )}
            {...props}
        />
    );
}
