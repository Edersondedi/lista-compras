import { describe, expect, it } from '@jest/globals';
import { casa, compararMercados, melhorDivisao, menorPorItem, numeroOuNulo, reais, sugerirAcabando } from '../src/lib/logic';
import { ItemLista, NotaFiscal, Oferta } from '../src/lib/types';

const item = (id: string, nome: string, comprado = false): ItemLista => ({
  id, nome, quantidade: '', categoria: 'Mercearia', comprado, criadoEm: '2026-11-20T00:00:00Z',
});
const nota = (mercado: string, data: string, itens: [string, number][]): NotaFiscal => ({
  id: mercado + data, mercado, data, origem: 'manual',
  total: itens.reduce((s, [, v]) => s + v, 0),
  itens: itens.map(([descricao, v]) => ({ descricao, quantidade: 1, unidade: 'UN', valorUnitario: v, valorTotal: v })),
});
const hoje = new Date('2026-11-27T12:00:00');

describe('casa', () => {
  it('casa item simples com descrição de nota', () => {
    expect(casa('café', 'CAFE TORRADO MOIDO 500G')).toBe(true);
    expect(casa('arroz tipo 1', 'ARROZ T1 5KG')).toBe(true);
    expect(casa('leite', 'LEITE INTEGRAL 1L')).toBe(true);
  });
  it('não casa produtos diferentes', () => {
    expect(casa('leite', 'LEITE CONDENSADO'.replace('LEITE', 'DOCE'))).toBe(false);
    expect(casa('feijão', 'ARROZ T1 5KG')).toBe(false);
  });
});

describe('compararMercados', () => {
  const lista = [item('1', 'arroz'), item('2', 'café'), item('3', 'leite'), item('4', 'banana', true)];
  const notas = [
    nota('Mercado A', '2026-11-20T10:00:00', [['ARROZ T1 5KG', 26.9], ['CAFE 500G', 21.9], ['LEITE INTEGRAL', 5.5]]),
    nota('Mercado B', '2026-11-18T10:00:00', [['ARROZ 5KG', 24.5], ['CAFE 500G', 23.0], ['LEITE 1L', 4.9]]),
    nota('Mercado B', '2026-11-01T10:00:00', [['ARROZ 5KG', 99]]), // nota antiga: deve ser ignorada
  ];

  it('soma os itens pendentes pelo preço mais recente e ordena pelo menor total', () => {
    const r = compararMercados(lista, notas, [], [], hoje);
    expect(r.map((x) => [x.mercado, x.total])).toEqual([['Mercado B', 52.4], ['Mercado A', 54.3]]);
    expect(r[0].encontrados).toBe(3);
  });

  it('aplica oferta de clube só se o usuário for cadastrado', () => {
    const ofertas: Oferta[] = [{ id: 'o', item: 'café', mercado: 'Mercado A', precoOferta: 17.49, tipo: 'clube', validade: '2026-11-30' }];
    expect(compararMercados(lista, notas, ofertas, [], hoje).find((x) => x.mercado === 'Mercado A')!.total).toBe(54.3);
    const comClube = compararMercados(lista, notas, ofertas, ['Mercado A'], hoje);
    expect(comClube[0]).toMatchObject({ mercado: 'Mercado A', total: 49.89 });
  });

  it('preço anotado do Menor Preço entra na comparação com a origem certa', () => {
    const ofertas: Oferta[] = [{ id: 'm', item: 'café', mercado: 'Koch', precoOferta: 18.5, tipo: 'todos', validade: '2026-11-30', fonte: 'menorpreco' }];
    const koch = compararMercados(lista, notas, ofertas, [], hoje).find((x) => x.mercado === 'Koch')!;
    expect(koch.precos['2']).toMatchObject({ preco: 18.5, origem: 'menorpreco' });
  });

  it('ignora oferta vencida', () => {
    const ofertas: Oferta[] = [{ id: 'o', item: 'café', mercado: 'Mercado A', precoOferta: 1, tipo: 'todos', validade: '2026-11-26' }];
    expect(compararMercados(lista, notas, ofertas, [], hoje).find((x) => x.mercado === 'Mercado A')!.total).toBe(54.3);
  });

  it('melhor divisão escolhe o mais barato de cada item', () => {
    const r = compararMercados(lista, notas, [], [], hoje);
    const d = melhorDivisao(r, lista)!;
    expect(d.total).toBe(51.3); // arroz B 24.5 + café A 21.9 + leite B 4.9
    expect(d.porMercado['Mercado A'].itens).toEqual(['café']);
  });

  it('menor preço por item', () => {
    const m = menorPorItem(compararMercados(lista, notas, [], [], hoje), lista);
    expect(m.map((x) => [x.item.nome, x.ofertas[0]?.mercado, x.ofertas[0]?.preco.preco])).toEqual([
      ['arroz', 'Mercado B', 24.5],
      ['café', 'Mercado A', 21.9],
      ['leite', 'Mercado B', 4.9],
    ]);
  });

  it('ignora preços mais velhos que o limite de dias', () => {
    const r = compararMercados(lista, notas, [], [], hoje, 8); // notas de 20/11 (7 dias) e 18/11 (9 dias)
    expect(r.find((x) => x.mercado === 'Mercado A')!.encontrados).toBe(3);
    expect(r.find((x) => x.mercado === 'Mercado B')!.encontrados).toBe(0);
  });

  it('prioriza mercado que tem mais itens', () => {
    const n2 = [...notas, nota('Mercado C', '2026-11-25T10:00:00', [['ARROZ', 10]])];
    expect(compararMercados(lista, n2, [], [], hoje).at(-1)!.mercado).toBe('Mercado C');
  });
});

describe('sugerirAcabando', () => {
  const notas = [
    nota('A', '2026-10-28T10:00:00', [['CAFE TORRADO 500G', 20], ['ARROZ 5KG', 25]]),
    nota('A', '2026-11-07T10:00:00', [['CAFE TORRADO 500G', 20]]),
    nota('A', '2026-11-17T10:00:00', [['CAFE TORRADO 500G', 20], ['ARROZ 5KG', 25]]),
  ];
  it('sugere café (a cada 10 dias, última há 10) e não arroz (a cada 20, última há 10)', () => {
    const sg = sugerirAcabando(notas, [], hoje);
    expect(sg.map((x) => x.nome)).toEqual(['Cafe Torrado']);
    expect(sg[0]).toMatchObject({ intervaloMedioDias: 10, diasDesdeUltima: 10 });
  });
  it('não sugere o que já está na lista', () => {
    expect(sugerirAcabando(notas, [item('1', 'café')], hoje)).toEqual([]);
  });
});

describe('formatos', () => {
  it('reais', () => {
    expect(reais(1234.5)).toBe('R$ 1.234,50');
    expect(reais(17.49)).toBe('R$ 17,49');
  });
  it('numeroOuNulo', () => {
    expect(numeroOuNulo('17,49')).toBe(17.49);
    expect(numeroOuNulo('1.234,50')).toBe(1234.5);
    expect(numeroOuNulo('abc')).toBeNull();
    expect(numeroOuNulo('')).toBeNull();
  });
});
