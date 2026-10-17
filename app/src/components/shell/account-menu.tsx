'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, UserRound } from 'lucide-react';
import { signOutAction } from '@/app/auth-actions';
import { IconButton } from '@/components/ui/button';

export function AccountMenu({ email }: { email: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton label={`Conta: ${email}`}><UserRound className="size-4" aria-hidden /></IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-64 rounded-md border border-border bg-surface p-1 shadow-lg">
          <DropdownMenu.Label className="truncate px-2 py-1.5 text-xs text-text-muted">{email}</DropdownMenu.Label>
          <DropdownMenu.Item asChild className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2">
            <Link href="/conta"><UserRound className="size-4" aria-hidden /> Minha conta</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => { void signOutAction('local'); }}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
          >
            <LogOut className="size-4" aria-hidden /> Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
