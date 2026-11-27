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

/** O que mudou entre duas versões, registro a registro (para gravar só o necessário e não apagar o que o outro fez). */
export function diferencas<T extends { id: string }>(antes: T[], depois: T[]) {
  const a: Record<string, T> = Object.fromEntries(antes.map((x) => [x.id, x]));
  const d: Record<string, T> = Object.fromEntries(depois.map((x) => [x.id, x]));
  const gravar: T[] = [];
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

/** Ordem de exibição: notas e ofertas mais recentes primeiro. */
export const ordenarNotas = <T extends { id: string; data: string }>(l: T[]) =>
  [...l].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.id < b.id ? 1 : -1));
export const ordenarOfertas = <T extends { id: string; criadoEm?: string }>(l: T[]) =>
  [...l].sort((a, b) => ((a.criadoEm ?? '') < (b.criadoEm ?? '') ? 1 : (a.criadoEm ?? '') > (b.criadoEm ?? '') ? -1 : a.id < b.id ? 1 : -1));

/** Junta registros pelo id: os da base ganham; os que só existem aqui entram. Devolve também o que precisa subir. */
export function juntarPorId<T extends { id: string }>(local: T[], remoto: T[]) {
  const ids = new Set(remoto.map((x) => x.id));
  const subir = local.filter((x) => !ids.has(x.id));
  return { todos: [...remoto, ...subir], subir };
}
