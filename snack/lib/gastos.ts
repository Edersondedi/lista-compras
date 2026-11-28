import { arred, casa, normalizar } from './logic';
import { Categoria, ItemLista, NotaFiscal, Oferta } from './types';

// ---------- Histórico de preço de um item ----------

export interface RegistroPreco {
  data: string;
  mercado: string;
  preco: number; // preço unitário
  origem: 'nota' | 'anotado';
  descricao: string;
  /** De onde veio, para poder corrigir: preço anotado (oferta) ou produto de uma nota. */
  ref: { tipo: 'oferta'; id: string } | { tipo: 'nota'; notaId: string; indice: number };
}

/** Todos os preços conhecidos de um item (notas e preços anotados), do mais recente para o mais antigo. */
export function historicoPrecos(item: string, notas: NotaFiscal[], ofertas: Oferta[]): RegistroPreco[] {
  const out: RegistroPreco[] = [];
  for (const n of notas) {
    n.itens.forEach((it, indice) => {
      if (it.valorUnitario > 0 && casa(item, it.descricao)) {
        out.push({ data: n.data, mercado: n.mercado, preco: it.valorUnitario, origem: 'nota', descricao: it.descricao, ref: { tipo: 'nota', notaId: n.id, indice } });
      }
    });
  }
  for (const o of ofertas) {
    if (o.precoOferta > 0 && casa(item, o.item)) {
      out.push({ data: o.criadoEm ?? '', mercado: o.mercado, preco: o.precoOferta, origem: 'anotado', descricao: o.item, ref: { tipo: 'oferta', id: o.id } });
    }
  }
  return out.filter((r) => r.data).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

export function resumoHistorico(h: RegistroPreco[]) {
  if (!h.length) return null;
  const precos = h.map((r) => r.preco);
  const min = Math.min(...precos);
  const onde = h.find((r) => r.preco === min)!;
  return {
    minimo: min,
    ondeMinimo: onde.mercado,
    dataMinimo: onde.data,
    medio: arred(precos.reduce((a, b) => a + b, 0) / precos.length),
    maximo: Math.max(...precos),
    quantidade: h.length,
  };
}

/** Quanto um preço está acima (+) ou abaixo (-) da média conhecida, em %. null se não há base. */
export function variacaoSobreMedia(preco: number, h: RegistroPreco[]): number | null {
  const r = resumoHistorico(h);
  if (!r || r.quantidade < 2 || r.medio <= 0) return null;
  return Math.round(((preco - r.medio) / r.medio) * 100);
}

// ---------- Categoria estimada de um produto da nota ----------

const PALAVRAS: [Categoria, RegExp][] = [
  ['Limpeza', /\b(deterg|sabao em po|sabao liq|lava roupa|amaciante|agua sanit|desinf|alvejante|limpador|multiuso|esponja|pano de chao|saco de lixo|saco lixo|veja|ype|omo|cloro|lustra|tira manchas)/],
  ['Higiene', /\b(shampoo|sh |condic|sabonete|creme dent|cr dent|escova dent|fio dental|desod|papel hig|pap hig|absorv|fralda|aparelho de barb|barbear|enxag bucal|hastes|cotonete|protetor sol)/],
  ['Carnes', /\b(carne|bov|frango|file|peito|coxa|sobrecoxa|asa|alcatra|patinho|acem|costela|picanha|linguica|lingui|suin|pernil|lombo|bacon|calabresa|carne moida|moida|hamburg|almondega|peixe|tilapia|salsicha)/],
  ['Frios e laticínios', /\b(leite|queijo|qjo|iogurte|iog|requeij|manteiga|margarina|presunto|mortadela|salame|creme de leite|cr leite|nata|ricota|mussarela|muss|prato|coalhada|bebida lactea)/],
  ['Bebidas', /\b(agua\b|refri|refrig|coca|guarana|cerveja|cerv|suco|agua min|agua com gas|agua s gas|vinho|energetico|cha pronto|achocolatado liq)/],
  ['Hortifrúti', /\b(banana|maca|laranja|limao|mamao|melancia|melao|uva|abacaxi|morango|tomate|batata|cebola|alho|cenoura|alface|repolho|brocolis|abobrinha|abobora|pepino|pimentao|mandioca|aipim|chuchu|beterraba|couve|rucula|ovos|ovo)/],
  ['Mercearia', /\b(arroz|feijao|acucar|cafe|coco|farinha|oleo|azeite|macarrao|massa|sal|molho|extrato|biscoito|bolacha|bisc|achocolat|aveia|granola|fuba|milho|ervilha|atum|sardinha|maionese|ketchup|mostarda|tempero|vinagre|pao|torrada|gelatina|leite cond|cr de leite|fermento|cereal|chocolate|bombom|pipoca)/],
];

/** Categoria do produto: primeiro pelo item da lista que bate com ele, depois por palavras-chave. */
export function categoriaDoProduto(descricao: string, lista: ItemLista[], frequentes: { nome: string; categoria: Categoria }[] = []): Categoria {
  const conhecido = [...lista, ...frequentes].find((i) => casa(i.nome, descricao));
  if (conhecido) return conhecido.categoria;
  const d = ` ${normalizar(descricao)} `;
  for (const [cat, re] of PALAVRAS) if (re.test(d)) return cat;
  return 'Outros';
}

// ---------- Resumo de gastos ----------

export const chaveMes = (iso: string) => iso.slice(0, 7); // "2026-11"

export function nomeMes(chave: string): string {
  const [a, m] = chave.split('-').map(Number);
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[m - 1]}/${String(a).slice(2)}`;
}

/** Últimos N meses (mais antigo primeiro), terminando no mês de "hoje". */
export function ultimosMeses(hoje: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export interface Fatia {
  nome: string;
  valor: number;
  compras: number;
}

const ordenar = (m: Map<string, Fatia>) => [...m.values()].map((f) => ({ ...f, valor: arred(f.valor) })).sort((a, b) => b.valor - a.valor);

export function resumoGastos(
  notas: NotaFiscal[],
  mes: string,
  lista: ItemLista[] = [],
  frequentes: { nome: string; categoria: Categoria }[] = [],
) {
  const doMes = notas.filter((n) => chaveMes(n.data) === mes);
  const porMercado = new Map<string, Fatia>();
  const porCategoria = new Map<string, Fatia>();
  const porItem = new Map<string, Fatia>();
  let total = 0;
  for (const n of doMes) {
    total += n.total;
    const m = porMercado.get(n.mercado) ?? { nome: n.mercado, valor: 0, compras: 0 };
    m.valor += n.total;
    m.compras += 1;
    porMercado.set(n.mercado, m);
    for (const it of n.itens) {
      const cat = categoriaDoProduto(it.descricao, lista, frequentes);
      const c = porCategoria.get(cat) ?? { nome: cat, valor: 0, compras: 0 };
      c.valor += it.valorTotal;
      c.compras += 1;
      porCategoria.set(cat, c);
      const k = normalizar(it.descricao);
      const p = porItem.get(k) ?? { nome: it.descricao, valor: 0, compras: 0 };
      p.valor += it.valorTotal;
      p.compras += 1;
      porItem.set(k, p);
    }
  }
  return {
    total: arred(total),
    compras: doMes.length,
    porMercado: ordenar(porMercado),
    porCategoria: ordenar(porCategoria),
    maioresItens: ordenar(porItem).slice(0, 5),
  };
}

export function totaisPorMes(notas: NotaFiscal[], meses: string[]) {
  return meses.map((m) => ({ mes: m, total: arred(notas.filter((n) => chaveMes(n.data) === m).reduce((s, n) => s + n.total, 0)) }));
}

/** Situação do mês frente à meta. Projeção linear pelo dia do mês (só para orientar, não é previsão). */
export function situacaoOrcamento(gasto: number, meta: number | null, hoje: Date) {
  if (!meta) return null;
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const dia = hoje.getDate();
  const usado = gasto / meta;
  const projecao = arred((gasto / dia) * diasNoMes);
  const nivel: 'ok' | 'atencao' | 'estourou' = usado >= 1 ? 'estourou' : usado >= 0.8 ? 'atencao' : 'ok';
  return { usado, restante: arred(meta - gasto), projecao, nivel };
}

// ---------- Itens frequentes ----------

export function itensFrequentes(
  frequencia: Record<string, { nome: string; categoria: Categoria; vezes: number; ultima: string }>,
  lista: ItemLista[],
  max = 8,
) {
  const pendentes = new Set(lista.filter((i) => !i.comprado).map((i) => normalizar(i.nome)));
  return Object.entries(frequencia)
    .filter(([k, f]) => f.vezes >= 2 && !pendentes.has(k))
    .map(([, f]) => f)
    .sort((a, b) => b.vezes - a.vezes || (a.ultima < b.ultima ? 1 : -1))
    .slice(0, max);
}

// ---------- Modo "No mercado" ----------

/** Ordem aproximada de corredor num supermercado. */
export const ORDEM_CORREDOR: Categoria[] = ['Hortifrúti', 'Mercearia', 'Bebidas', 'Limpeza', 'Higiene', 'Frios e laticínios', 'Carnes', 'Outros'];

export function porCorredor(lista: ItemLista[]) {
  return ORDEM_CORREDOR.map((c) => ({ categoria: c, itens: lista.filter((i) => i.categoria === c) })).filter((g) => g.itens.length);
}
