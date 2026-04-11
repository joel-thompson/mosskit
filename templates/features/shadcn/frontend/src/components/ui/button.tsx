import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-sky-400 px-4 py-2 text-slate-950 hover:bg-sky-300",
        ghost: "px-4 py-2 text-slate-100 hover:bg-slate-800"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";
