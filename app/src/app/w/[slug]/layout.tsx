import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/shell';
import { LIVE_SCREENS } from '@/components/page';
import { NotFoundError, context, getWorkspace, listWorkspaces } from '@/lib/data';
import { resumeStuck } from '@/lib/jobs/run';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let ws;
  try {
    ws = await getWorkspace(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  await resumeStuck(ws.id);
  const all = (await listWorkspaces()).map((w) => ({ slug: w.slug, name: w.name, status: w.status }));
  return (
    <AppShell current={{ slug: ws.slug, name: ws.name, status: ws.status }} workspaces={all} liveScreens={LIVE_SCREENS} userEmail={(await context()).user.email}>
      {children}
    </AppShell>
  );
}
