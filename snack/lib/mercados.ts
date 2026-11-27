/**
 * Mercados de Blumenau usados nos atalhos de busca e encartes.
 * - busca: link da busca pública do próprio site, quando confirmado (Fort);
 * - site: domínio oficial confirmado -> busca do Google restrita ao site;
 * - sem nenhum dos dois -> busca do Google com o nome do mercado.
 * - tiendeo: página de encartes da rede no Tiendeo (agregador de folhetos).
 */
export interface Mercado {
  nome: string;
  site?: string;
  busca?: (item: string) => string;
  tiendeo?: string;
}

export const MERCADOS: Mercado[] = [
  { nome: 'Cooper', site: 'minhacooper.com.br', tiendeo: 'cooper' },
  { nome: 'Koch', tiendeo: 'supermercados-koch' },
  { nome: 'Unidos' },
  {
    nome: 'Fort',
    busca: (item) => `https://www.fortatacadista.com.br/busca/${encodeURIComponent(item)}`,
    tiendeo: 'fort-atacadista',
  },
  { nome: 'Rede Top', tiendeo: 'rede-top' },
  { nome: 'Brasil Atacadista', tiendeo: 'brasil-atacadista' },
  { nome: 'Atacadão', site: 'atacadao.com.br', tiendeo: 'atacadao' },
  { nome: 'Giassi', site: 'giassi.com.br', tiendeo: 'giassi-supermercados' },
  { nome: 'Bistek', tiendeo: 'bistek-supermercados' },
];

export const NOMES_MERCADOS = MERCADOS.map((m) => m.nome);

export function linkBusca(m: Mercado, item: string): string {
  if (m.busca) return m.busca(item);
  const q = m.site ? `${item} site:${m.site}` : `${item} preço ${m.nome} supermercado Blumenau`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function linkEncarte(m: Mercado): string {
  return m.tiendeo
    ? `https://www.tiendeo.com.br/blumenau/${m.tiendeo}`
    : `https://www.google.com/search?q=${encodeURIComponent(`encarte ofertas ${m.nome} Blumenau`)}`;
}
