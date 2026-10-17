'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Recarrega os dados do servidor enquanto um job roda. shortcut: polling de 1s.
 *  Upgrade: Supabase Realtime nas tabelas onboarding_stages e creatives (o componente vira uma inscrição). */
export function AutoRefresh({ active, intervalMs = 1000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, router]);
  return null;
}
