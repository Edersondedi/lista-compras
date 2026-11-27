import { ItemLista, NotaFiscal, Oferta } from './types';

const STOPWORDS = new Set(['de', 'da', 'do', 'com', 'e', 'para', 'tipo', 'em']);

/** Minúsculas, sem acento, só letras/números. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Um item da lista "casa" com a descrição de um produto quando todas as
 * palavras relevantes do item aparecem no começo de alguma palavra da descrição.
 * Ex.: "cafe" casa com "CAFE TORRADO MOIDO 500G"; "arroz" com "ARROZ T1 5KG".
 */
export function casa(itemLista: string, descricao: string): boolean {
  const alvo = tokens(itemLista);
  if (alvo.length === 0) return false;
  const desc = tokens(descricao);
  return alvo.every((t) => desc.some((d) => d.startsWith(t) || (t.startsWith(d) && d.length >= 4)));
}

export interface PrecoEncontrado {
  preco: number;
  data: string;
  origem: 'nota' | 'oferta';
  descricao: string;
}

function ofertaValida(o: Oferta, hoje: Date): boolean {
  if (!o.validade) return true;
  return new Date(o.validade + 'T23:59:59') >= hoje;
}

/** Último preço unitário conhecido do item em um mercado, considerando ofertas válidas. */
export function precoNoMercado(
  item: string,
  mercado: string,
  notas: NotaFiscal[],
  ofertas: Oferta[],
  clubes: string[],
  hoje: Date = new Date(),
): PrecoEncontrado | null {
  let melhor: PrecoEncontrado | null = null;

  const doMercado = notas
    .filter((n) => normalizar(n.mercado) === normalizar(mercado))
    .sort((a, b) => b.data.localeCompare(a.data));
  for (const nota of doMercado) {
    const it = nota.itens.find((i) => casa(item, i.descricao));
    if (it) {
      melhor = { preco: it.valorUnitario, data: nota.data, origem: 'nota', descricao: it.descricao };
      break;
    }
  }

  const temClube = clubes.some((c) => normalizar(c) === normalizar(mercado));
  for (const o of ofertas) {
    if (normalizar(o.mercado) !== normalizar(mercado)) continue;
    if (!casa(item, o.item) || !ofertaValida(o, hoje)) continue;
    if (o.tipo === 'clube' && !temClube) continue;
    if (!melhor || o.precoOferta < melhor.preco) {
      melhor = { preco: o.precoOferta, data: o.validade ?? hoje.toISOString(), origem: 'oferta', descricao: o.item };
    }
  }
  return melhor;
}

export function mercadosConhecidos(notas: NotaFiscal[], ofertas: Oferta[]): string[] {
  const mapa = new Map<string, string>();
  for (const n of notas) mapa.set(normalizar(n.mercado), n.mercado);
  for (const o of ofertas) if (!mapa.has(normalizar(o.mercado))) mapa.set(normalizar(o.mercado), o.mercado);
  return [...mapa.values()];
}

export interface ResultadoMercado {
  mercado: string;
  total: number;
  encontrados: number;
  faltando: string[];
  precos: Record<string, PrecoEncontrado>;
}

/**
 * Custo da lista em cada mercado. Ordena por mais itens encontrados e, em empate, menor total.
 * A quantidade da lista é texto livre, então o total soma 1 unidade de cada item
 * (estimativa; a quantidade real fica para uma próxima versão).
 */
export function compararMercados(
  lista: ItemLista[],
  notas: NotaFiscal[],
  ofertas: Oferta[],
  clubes: string[],
  hoje: Date = new Date(),
): ResultadoMercado[] {
  const pendentes = lista.filter((i) => !i.comprado);
  return mercadosConhecidos(notas, ofertas)
    .map((mercado) => {
      const precos: Record<string, PrecoEncontrado> = {};
      const faltando: string[] = [];
      let total = 0;
      for (const item of pendentes) {
        const p = precoNoMercado(item.nome, mercado, notas, ofertas, clubes, hoje);
        if (p) {
          precos[item.id] = p;
          total += p.preco;
        } else faltando.push(item.nome);
      }
      return { mercado, total: arred(total), encontrados: pendentes.length - faltando.length, faltando, precos };
    })
    .sort((a, b) => b.encontrados - a.encontrados || a.total - b.total);
}

export interface Divisao {
  mercados: [string, string];
  total: number;
  porMercado: Record<string, { itens: string[]; total: number }>;
}

/** Melhor combinação de 2 mercados que cobre todos os itens encontrados pelo melhor mercado único. */
export function melhorDivisao(resultados: ResultadoMercado[], lista: ItemLista[]): Divisao | null {
  const pendentes = lista.filter((i) => !i.comprado);
  let melhor: Divisao | null = null;
  for (let a = 0; a < resultados.length; a++) {
    for (let b = a + 1; b < resultados.length; b++) {
      const A = resultados[a];
      const B = resultados[b];
      const por: Divisao['porMercado'] = { [A.mercado]: { itens: [], total: 0 }, [B.mercado]: { itens: [], total: 0 } };
      let total = 0;
      let cobertos = 0;
      for (const item of pendentes) {
        const pa = A.precos[item.id];
        const pb = B.precos[item.id];
        const escolha = pa && (!pb || pa.preco <= pb.preco) ? [A.mercado, pa] as const : pb ? [B.mercado, pb] as const : null;
        if (!escolha) continue;
        cobertos++;
        por[escolha[0]].itens.push(item.nome);
        por[escolha[0]].total += escolha[1].preco;
        total += escolha[1].preco;
      }
      if (por[A.mercado].itens.length === 0 || por[B.mercado].itens.length === 0) continue;
      if (cobertos < (resultados[0]?.encontrados ?? 0)) continue;
      total = arred(total);
      for (const k of Object.keys(por)) por[k].total = arred(por[k].total);
      if (!melhor || total < melhor.total) melhor = { mercados: [A.mercado, B.mercado], total, porMercado: por };
    }
  }
  return melhor;
}

export interface Sugestao {
  nome: string;
  intervaloMedioDias: number;
  diasDesdeUltima: number;
}

/**
 * Produtos comprados em pelo menos 2 notas, cujo tempo desde a última compra já
 * passou de 90% do intervalo médio entre compras, e que não estão na lista.
 */
export function sugerirAcabando(notas: NotaFiscal[], lista: ItemLista[], hoje: Date = new Date()): Sugestao[] {
  const compras = new Map<string, { nome: string; datas: number[] }>();
  for (const n of notas) {
    const t = new Date(n.data).setHours(0, 0, 0, 0);
    for (const it of n.itens) {
      const chave = tokens(it.descricao).slice(0, 2).join(' ');
      if (!chave) continue;
      const reg = compras.get(chave) ?? { nome: titulo(chave), datas: [] };
      if (!reg.datas.includes(t)) reg.datas.push(t);
      compras.set(chave, reg);
    }
  }
  const dia = 86_400_000;
  const out: Sugestao[] = [];
  for (const { nome, datas } of compras.values()) {
    if (datas.length < 2) continue;
    datas.sort((a, b) => a - b);
    const intervalo = (datas[datas.length - 1] - datas[0]) / (datas.length - 1) / dia;
    const desde = (new Date(hoje).setHours(0, 0, 0, 0) - datas[datas.length - 1]) / dia;
    if (intervalo < 1 || desde < intervalo * 0.9) continue;
    if (lista.some((i) => !i.comprado && casa(i.nome, nome))) continue;
    out.push({ nome, intervaloMedioDias: Math.round(intervalo), diasDesdeUltima: Math.round(desde) });
  }
  return out.sort((a, b) => b.diasDesdeUltima / b.intervaloMedioDias - a.diasDesdeUltima / a.intervaloMedioDias);
}

function titulo(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function arred(v: number): number {
  return Math.round(v * 100) / 100;
}

export function reais(v: number): string {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "1 item", "3 itens" */
export function qtdItens(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'itens'}`;
}

/** "17,49" ou "17.49" → 17.49; vazio ou inválido → null. */
export function numeroOuNulo(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function novoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
