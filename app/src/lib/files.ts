/** URL pública (dentro do app) de um arquivo salvo. */
export const fileUrl = (path: string | null | undefined) => (path ? `/api/files/${path}` : null);
