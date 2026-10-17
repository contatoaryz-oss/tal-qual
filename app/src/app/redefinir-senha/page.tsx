import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';
import { SimplePage } from '@/components/simple-page';
import { PageHeader } from '@/components/page';
import { NewPasswordForm } from '../(auth)/forms';

export const metadata: Metadata = { title: 'Nova senha' };

export default async function ResetPage() {
  const user = await requireUser();
  return (
    <SimplePage>
      <PageHeader title="Criar uma senha nova" description={`Para ${user.email}.`} />
      <div className="rounded-lg border border-border bg-surface p-6">
        <NewPasswordForm after={<Link href="/" className="font-semibold underline">Ir para os clientes</Link>} />
      </div>
    </SimplePage>
  );
}
