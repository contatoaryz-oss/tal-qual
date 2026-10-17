'use client';

import { useOptimistic, useTransition } from 'react';
import { Star } from 'lucide-react';
import { IconButton } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

export function FavoriteButton({ favorite, onToggle, size = 'sm' }: { favorite: boolean; onToggle: (v: boolean) => Promise<void>; size?: 'sm' | 'md' }) {
  const [optimistic, setOptimistic] = useOptimistic(favorite);
  const [, start] = useTransition();
  return (
    <IconButton
      label={optimistic ? 'Tirar dos favoritos' : 'Marcar como favorito'}
      aria-pressed={optimistic}
      size={size}
      variant="secondary"
      onClick={() => start(async () => { setOptimistic(!optimistic); await onToggle(!optimistic); })}
    >
      <Star className={cn('size-4', optimistic && 'fill-accent text-on-accent-subtle')} aria-hidden />
    </IconButton>
  );
}
