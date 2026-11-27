import { normalizar } from './logic';
import { CATEGORIAS, Categoria, ItemLista } from './types';

/** Endereço público do app (GitHub Pages). O link de compartilhamento sempre aponta para cá. */
export const URL_APP = 'https://edersondedi.github.io/lista-compras/';

export interface ItemCompartilhado {
  nome: string;
  quantidade: string;
  categoria: Categoria;
}

/** Itens pendentes -> link curto o bastante para WhatsApp: ?lista=[["arroz","5 kg",0],...] */
export function gerarLink(itens: ItemLista[]): string {
  const dados = itens
    .filter((i) => !i.comprado)
    .map((i) => [i.nome, i.quantidade, Math.max(0, CATEGORIAS.indexOf(i.categoria))]);
  return `${URL_APP}?lista=${encodeURIComponent(JSON.stringify(dados))}`;
}

export function textoParaEnviar(itens: ItemLista[]): string {
  const pend = itens.filter((i) => !i.comprado);
  const linhas = pend.map((i) => `• ${i.nome}${i.quantidade ? ` (${i.quantidade})` : ''}`).join('\n');
  return `Lista de compras (${pend.length} ${pend.length === 1 ? 'item' : 'itens'}):\n${linhas}\n\nAbra no Compra Certa para juntar à sua lista:\n${gerarLink(itens)}`;
}

/** Aceita o valor do parâmetro, o link inteiro ou a mensagem inteira do WhatsApp. */
export function lerLista(entrada: string): ItemCompartilhado[] | null {
  let bruto = entrada.trim();
  const m = bruto.match(/[?&]lista=([^&\s]+)/);
  if (m) bruto = m[1];
  let dados: unknown;
  try {
    dados = JSON.parse(bruto.startsWith('[') ? bruto : decodeURIComponent(bruto));
  } catch {
    return null;
  }
  if (!Array.isArray(dados)) return null;
  const itens: ItemCompartilhado[] = [];
  for (const d of dados) {
    if (!Array.isArray(d) || typeof d[0] !== 'string' || !d[0].trim()) continue;
    itens.push({
      nome: d[0].trim().slice(0, 80),
      quantidade: typeof d[1] === 'string' ? d[1].slice(0, 30) : '',
      categoria: CATEGORIAS[typeof d[2] === 'number' ? d[2] : 7] ?? 'Outros',
    });
  }
  return itens.length ? itens.slice(0, 200) : null;
}

/** Separa o que é novo do que já está na lista (mesmo nome, ignorando acento e maiúsculas). */
export function separarNovos(recebidos: ItemCompartilhado[], lista: ItemLista[]) {
  const existentes = new Set(lista.filter((i) => !i.comprado).map((i) => normalizar(i.nome)));
  const novos: ItemCompartilhado[] = [];
  const repetidos: ItemCompartilhado[] = [];
  for (const r of recebidos) {
    const k = normalizar(r.nome);
    if (existentes.has(k)) repetidos.push(r);
    else {
      existentes.add(k);
      novos.push(r);
    }
  }
  return { novos, repetidos };
}
