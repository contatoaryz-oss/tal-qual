import { cva } from 'class-variance-authority';
import { cn, focusRing } from './cn';

// Sem 'use client': usado também por <Link> em server components.
export const buttonStyles = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold select-none',
    'transition-[background-color,box-shadow,transform] duration-[var(--duration-fast)] ease-standard',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    focusRing,
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover',
        accent: 'bg-accent text-on-accent shadow-sm hover:bg-accent-hover',
        secondary: 'bg-surface text-text border border-border-input hover:bg-surface-2',
        ghost: 'bg-transparent text-text hover:bg-surface-2',
        danger: 'bg-danger text-on-danger hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

