'use client';

import { useId, type ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Check, ChevronDown } from 'lucide-react';
import { cn, focusRing } from './cn';

/* ---------------- Select ---------------- */
type Option = { value: string; label: string; description?: string; icon?: ReactNode };

export function Select({
  label, options, value, onValueChange, placeholder = 'Escolher', disabled,
}: {
  label: string; options: Option[]; value?: string; onValueChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label id={id} className="text-sm font-medium text-text">{label}</label>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          aria-labelledby={id}
          className={cn(
            'inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border-input bg-surface px-3 text-sm text-text',
            'data-[placeholder]:text-text-muted disabled:cursor-not-allowed disabled:bg-surface-2',
            focusRing,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon><ChevronDown className="size-4 text-text-muted" aria-hidden /></SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg"
          >
            <SelectPrimitive.Viewport>
              {options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex cursor-pointer select-none items-start gap-2 rounded-sm py-2 pl-8 pr-3 text-sm text-text outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 top-2.5">
                    <Check className="size-4 text-primary" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                  {o.icon}
                  <span className="flex flex-col">
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    {o.description && <span className="text-xs text-text-muted">{o.description}</span>}
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({ label, defaultChecked, disabled }: { label: string; defaultChecked?: boolean; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={id}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className={cn(
          'flex size-5 items-center justify-center rounded-sm border border-border-input bg-surface',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50',
          focusRing,
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5 text-on-primary" strokeWidth={3} aria-hidden />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className="text-sm text-text">{label}</label>
    </div>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ label, defaultChecked, disabled }: { label: string; defaultChecked?: boolean; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <SwitchPrimitive.Root
        id={id}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border border-border-input bg-surface-2 transition-colors',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50',
          focusRing,
        )}
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform duration-[var(--duration-fast)] data-[state=checked]:translate-x-[21px]" />
      </SwitchPrimitive.Root>
      <label htmlFor={id} className="text-sm text-text">{label}</label>
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, defaultValue }: { tabs: { value: string; label: string; content: ReactNode }[]; defaultValue: string }) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue}>
      <TabsPrimitive.List className="flex gap-1 border-b border-border" aria-label="Seções">
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-muted hover:text-text',
              'data-[state=active]:border-primary data-[state=active]:text-text',
              focusRing,
            )}
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className={cn('pt-4', focusRing)}>
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
