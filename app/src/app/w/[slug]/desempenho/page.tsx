import { ComingSoon } from '@/components/page';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ComingSoon id="S12" slug={slug} />;
}
