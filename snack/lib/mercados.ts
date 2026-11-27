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

const enc = encodeURIComponent;
// Links conferidos manualmente em 27/11/2026 (busca por "arroz" abriu a lista de produtos com preço).
export const MERCADOS: Mercado[] = [
  { nome: 'Cooper', site: 'minhacooper.com.br', tiendeo: 'cooper' }, // busca exige CEP; link direto não identificado
  { nome: 'Koch', busca: (q) => `https://www.superkoch.com.br/busca/${enc(q)}`, tiendeo: 'supermercados-koch' },
  { nome: 'Unidos' },
  { nome: 'Fort', busca: (q) => `https://www.fortatacadista.com.br/busca/${enc(q)}`, tiendeo: 'fort-atacadista' },
  { nome: 'Rede Top', tiendeo: 'rede-top' },
  { nome: 'Brasil Atacadista', tiendeo: 'brasil-atacadista' }, // sem loja online (ofertas por WhatsApp)
  { nome: 'Atacadão', busca: (q) => `https://www.atacadao.com.br/s?q=${enc(q)}`, tiendeo: 'atacadao' },
  { nome: 'Giassi', busca: (q) => `https://www.giassi.com.br/${enc(q)}?_q=${enc(q)}&map=ft`, tiendeo: 'giassi-supermercados' },
  { nome: 'Bistek', busca: (q) => `https://www.bistek.com.br/${enc(q)}?_q=${enc(q)}&map=ft`, tiendeo: 'bistek-supermercados' },
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
