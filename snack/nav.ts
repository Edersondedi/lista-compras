type Rota = '/' | '/comparar' | '/promocoes' | '/gastos' | '/nota';
let ouvinte: ((r: Rota) => void) | null = null;
export const router = { navigate: (r: Rota) => ouvinte?.(r) };
export function ouvirNavegacao(f: (r: Rota) => void) { ouvinte = f; }
export type { Rota };
