import { normalizar } from './logic';
import { ItemLista } from './types';

// Sem 0/O, 1/I/L para não confundir ao digitar. 31^8 ≈ 850 bilhões de combinações.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const REGEX_CODIGO = /^[2-9A-HJ-KMNP-Z]{8}$/;

export function gerarCodigo(aleatorio: () => number = Math.random): string {
  let c = '';
  for (let i = 0; i < 8; i++) c += ALFABETO[Math.floor(aleatorio() * ALFABETO.length)];
  return c;
}

/** "k7p2-x9ab" -> "K7P2X9AB"; aceita também o link inteiro com ?codigo=. Retorna null se não for um código válido. */
export function lerCodigo(entrada: string): string | null {
  const m = entrada.match(/[?&]codigo=([^&\s]+)/);
  const bruto = (m ? decodeURIComponent(m[1]) : entrada).toUpperCase().replace(/[^0-9A-Z]/g, '');
  return REGEX_CODIGO.test(bruto) ? bruto : null;
}

export const mostrarCodigo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

export type MapaItens = Record<string, ItemLista>;

export const paraMapa = (lista: ItemLista[]): MapaItens => Object.fromEntries(lista.map((i) => [i.id, i]));

export const doMapa = (m: MapaItens | undefined): ItemLista[] =>
  Object.values(m ?? {}).sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : a.id < b.id ? -1 : 1));

/** O que mudou entre duas versões da lista, item a item (para gravar só o necessário e não apagar o que o outro fez). */
export function diferencas(antes: ItemLista[], depois: ItemLista[]) {
  const a = paraMapa(antes);
  const d = paraMapa(depois);
  const gravar: ItemLista[] = [];
  const apagar: string[] = [];
  for (const [id, item] of Object.entries(d)) if (JSON.stringify(a[id]) !== JSON.stringify(item)) gravar.push(item);
  for (const id of Object.keys(a)) if (!(id in d)) apagar.push(id);
  return { gravar, apagar };
}

/** Ao entrar numa lista existente: meus itens pendentes que ela ainda não tem (pelo nome). */
export function meusItensQueFaltam(minha: ItemLista[], remota: ItemLista[]): ItemLista[] {
  const tem = new Set(remota.filter((i) => !i.comprado).map((i) => normalizar(i.nome)));
  const novos: ItemLista[] = [];
  for (const i of minha) {
    if (i.comprado) continue;
    const k = normalizar(i.nome);
    if (tem.has(k)) continue;
    tem.add(k);
    novos.push(i);
  }
  return novos;
}
