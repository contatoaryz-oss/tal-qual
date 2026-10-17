/** Corta no limite sem partir palavra: volta até o último espaço e fecha com "…". */
export function clip(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const room = t.slice(0, max - 1);
  const space = room.lastIndexOf(' ');
  const cut = space > max * 0.5 ? room.slice(0, space) : room; // palavra gigante: corta nela mesma
  return cut.replace(/[\s,;:–—-]+$/, '') + '…';
}
