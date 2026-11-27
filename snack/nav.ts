type Rota = '/' | '/mercado' | '/comparar' | '/promocoes' | '/gastos' | '/nota' | '/ajuda';
let ouvinte: ((r: Rota) => void) | null = null;
export const router = { navigate: (r: Rota) => ouvinte?.(r) };
export function ouvirNavegacao(f: (r: Rota) => void) { ouvinte = f; }
export type { Rota };
