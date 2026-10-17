import type { Metadata } from 'next';
import { LogOut } from 'lucide-react';
import { signOutAction } from '@/app/auth-actions';
import { context, listWorkspaces } from '@/lib/data';
import { SimplePage } from '@/components/simple-page';
import { PageHeader, Section } from '@/components/page';
import { Button } from '@/components/ui/button';
import { NewPasswordForm } from '../(auth)/forms';
import { DeleteAccount } from './delete-account';

export const metadata: Metadata = { title: 'Minha conta' };
const ROLE = { owner: 'Dono', admin: 'Admin', member: 'Membro' } as const;

export default async function AccountPage() {
  const { user, role } = await context();
  const clients = (await listWorkspaces()).length;
  return (
    <SimplePage>
      <PageHeader title="Minha conta" back={{ href: '/', label: 'Clientes' }} />
      <div className="flex flex-col gap-4">
        <Section title="Acesso">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">E-mail</dt><dd className="break-all text-text">{user.email}</dd>
            <dt className="text-text-muted">Papel na agência</dt><dd className="text-text">{ROLE[role]}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={signOutAction.bind(null, 'local')}><Button type="submit" variant="secondary" icon={<LogOut className="size-4" aria-hidden />}>Sair deste aparelho</Button></form>
            <form action={signOutAction.bind(null, 'global')}><Button type="submit" variant="secondary">Sair de todos os aparelhos</Button></form>
          </div>
        </Section>
        <Section title="Trocar senha"><NewPasswordForm /></Section>
        <Section title="Apagar conta" description={`Apaga sua conta e, se você for o único dono, a agência inteira: ${clients} ${clients === 1 ? 'cliente' : 'clientes'}, personas, ofertas, criativos e arquivos. Não dá para desfazer.`}>
          <DeleteAccount email={user.email} />
        </Section>
      </div>
    </SimplePage>
  );
}
