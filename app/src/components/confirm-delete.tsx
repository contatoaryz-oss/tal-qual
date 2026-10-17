'use client';

import { useTransition } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlay';

/** Botão "Apagar" com confirmação em diálogo. Nada some sem um segundo clique. */
export function ConfirmDelete({ what, detail, action }: { what: string; detail: string; action: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <Dialog
      size="sm"
      title={`Apagar ${what}?`}
      description={detail}
      trigger={<Button variant="ghost" icon={<Trash2 className="size-4" aria-hidden />}>Apagar</Button>}
      footer={
        <>
          <DialogPrimitive.Close asChild><Button variant="secondary">Cancelar</Button></DialogPrimitive.Close>
          <Button variant="danger" loading={pending} onClick={() => start(() => action())}>Apagar</Button>
        </>
      }
    />
  );
}
