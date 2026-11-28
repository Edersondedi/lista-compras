import { arred, casa, normalizar } from './logic';
import { ItemNota, NotaFiscal, RegistroMercado } from './types';

export interface LinhaConferencia {
  nome: string;
  anotado: number;
  cobrado: number | null; // null = não achei na nota
  descricoes: string[]; // produtos da nota ligados a este item
  diferenca: number | null; // cobrado - anotado
}

export interface Conferencia {
  linhas: LinhaConferencia[];
  naoAnotados: ItemNota[]; // estão na nota, mas não foram anotados no mercado
  totalAnotado: number;
  totalNota: number;
  diferencaTotal: number; // totalNota - totalAnotado
  cobradoAMais: number; // soma das diferenças positivas nos itens encontrados
  cobradoAMenos: number;
}

/**
 * Liga cada item anotado no mercado aos produtos da nota (pelo nome) e compara valores.
 * Produtos repetidos na nota (passados duas vezes no caixa) somam no mesmo item.
 */
export function compararCompra(registro: RegistroMercado, nota: NotaFiscal): Conferencia {
  const usados = new Set<number>();
  const linhas: LinhaConferencia[] = [];
  for (const it of registro.itens) {
    const idx: number[] = [];
    nota.itens.forEach((n, k) => {
      if (!usados.has(k) && casa(it.nome, n.descricao)) idx.push(k);
    });
    // se mais de um produto diferente casou, fica com os iguais ao primeiro (ex.: o mesmo café passado 2x)
    const escolhidos = idx.filter((k) => normalizar(nota.itens[k].descricao) === normalizar(nota.itens[idx[0]]?.descricao ?? ''));
    escolhidos.forEach((k) => usados.add(k));
    const cobrado = escolhidos.length ? arred(escolhidos.reduce((s, k) => s + nota.itens[k].valorTotal, 0)) : null;
    linhas.push({
      nome: it.nome,
      anotado: it.preco,
      cobrado,
      descricoes: escolhidos.map((k) => nota.itens[k].descricao),
      diferenca: cobrado === null ? null : arred(cobrado - it.preco),
    });
  }
  const naoAnotados = nota.itens.filter((_, k) => !usados.has(k));
  const difs = linhas.map((l) => l.diferenca ?? 0);
  return {
    linhas,
    naoAnotados,
    totalAnotado: arred(registro.total),
    totalNota: arred(nota.total),
    diferencaTotal: arred(nota.total - registro.total),
    cobradoAMais: arred(difs.filter((d) => d > 0).reduce((a, b) => a + b, 0)),
    cobradoAMenos: arred(-difs.filter((d) => d < 0).reduce((a, b) => a + b, 0)),
  };
}

const mesmoMercado = (a: string, b: string) => {
  const x = normalizar(a);
  const y = normalizar(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

/** Nota mais provável para o registro: mesmo mercado e até 2 dias de diferença, a mais próxima no tempo. */
export function notaProvavel(registro: RegistroMercado, notas: NotaFiscal[]): NotaFiscal | null {
  const t = new Date(registro.data).getTime();
  const cands = notas
    .filter((n) => mesmoMercado(n.mercado, registro.mercado))
    .map((n) => ({ n, dt: Math.abs(new Date(n.data).getTime() - t) }))
    .filter((c) => c.dt <= 2 * 86_400_000)
    .sort((a, b) => a.dt - b.dt);
  return cands[0]?.n ?? null;
}
