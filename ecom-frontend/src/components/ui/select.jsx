import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export function Select({ value, onValueChange, children, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const options = [];
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach((child) => {
        if (child && child.type === SelectItem) {
            options.push({ value: child.props.value, label: child.props.children });
        }
    });

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-input px-3 py-2 text-sm transition-all duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                    !selected && "text-muted-foreground"
                )}
            >
                {selected ? selected.label : placeholder}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-xl">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onValueChange(opt.value); setOpen(false); }}
                            className={cn(
                                "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                                value === opt.value && "bg-primary/20 text-primary font-medium"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function SelectItem({ value, children }) {
    return null;
}
