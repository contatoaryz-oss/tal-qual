// Rótulos compartilhados por server e client components (sem 'use client').

export const KIND_OPTIONS = [
  { value: 'service', label: 'Serviço' },
  { value: 'product', label: 'Produto' },
  { value: 'package', label: 'Pacote' },
  { value: 'promotion', label: 'Promoção' },
  { value: 'lead_magnet', label: 'Isca (material grátis)' },
];

export const kindLabel = (k: string) => KIND_OPTIONS.find((o) => o.value === k)?.label ?? k;

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
