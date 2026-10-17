import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { context, getBrandKit, listWorkspaces } from '@/lib/data';
import { AccountMenu } from '@/components/shell/account-menu';
import { fileUrl } from '@/lib/files';
import { buttonStyles } from '@/components/ui/button-styles';
import { Badge, EmptyState } from '@/components/ui/display';
import { ThemeToggle } from '@/components/shell/shell';
import { focusRing } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const { user } = await context();
  const workspaces = await listWorkspaces();
  const logos = new Map(await Promise.all(workspaces.map(async (w) => [w.id, fileUrl((await getBrandKit(w.id)).logoPath)] as const)));
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[var(--layout-header)] items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <span className="font-display text-md font-extrabold text-text">Tal Qual</span>
        <div className="flex items-center gap-1"><ThemeToggle /><AccountMenu email={user.email} /></div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-[var(--layout-content-max)] px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-text md:text-3xl">Clientes</h1>
            <p className="mt-1 text-md text-text-muted">Cada cliente tem a própria marca, personas, ofertas e criativos.</p>
          </div>
          <Link href="/novo" className={buttonStyles({ variant: 'primary' })}>
            <Plus className="size-4" aria-hidden /> Novo cliente
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <EmptyState
            icon={<Users className="size-7" />}
            title="Nenhum cliente ainda"
            body="Cole o site ou o @ do Instagram do primeiro cliente para começar."
            action={<Link href="/novo" className={buttonStyles({ variant: 'accent' })}>Cadastrar cliente</Link>}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((w) => {
              const logo = logos.get(w.id);
              return (
                <li key={w.id}>
                  <Link
                    href={w.status === 'onboarding' ? `/w/${w.slug}/onboarding` : `/w/${w.slug}/marca`}
                    className={`flex h-full items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md ${focusRing}`}
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" className="max-h-12 max-w-12 object-contain" />
                      ) : (
                        <Users className="size-6 text-text-muted" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold text-text">{w.name}</span>
                      <span className="block truncate text-sm text-text-muted">{w.instagramHandle ? `@${w.instagramHandle}` : w.websiteUrl}</span>
                    </span>
                    {w.status === 'onboarding' && <Badge tone="warning" size="sm">lendo…</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
