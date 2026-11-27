import { describe, expect, it } from '@jest/globals';
import {
  categoriaDoProduto,
  historicoPrecos,
  itensFrequentes,
  nomeMes,
  porCorredor,
  resumoGastos,
  resumoHistorico,
  situacaoOrcamento,
  totaisPorMes,
  ultimosMeses,
  variacaoSobreMedia,
} from '../src/lib/gastos';
import { ItemLista, NotaFiscal, Oferta } from '../src/lib/types';

const nota = (id: string, mercado: string, data: string, itens: [string, number, number][]): NotaFiscal => ({
  id, mercado, data, origem: 'qrcode',
  itens: itens.map(([descricao, quantidade, valorUnitario]) => ({ descricao, quantidade, unidade: 'UN', valorUnitario, valorTotal: quantidade * valorUnitario })),
  total: itens.reduce((s, [, q, v]) => s + q * v, 0),
});
const item = (nome: string, categoria: ItemLista['categoria'] = 'Mercearia', comprado = false): ItemLista => ({
  id: nome, nome, quantidade: '', categoria, comprado, criadoEm: '2026-11-01T00:00:00Z',
});

const notas = [
  nota('a', 'Fort Atacadista', '2026-11-03T10:00:00Z', [['CAFE PILAO 500G', 2, 18.9], ['DETERGENTE YPE 500ML', 3, 2.5]]),
  nota('b', 'Cooper', '2026-11-20T10:00:00Z', [['CAFE PILAO 500G', 1, 21.5], ['PEITO FRANGO KG', 1.5, 16]]),
  nota('c', 'Cooper', '2026-10-15T10:00:00Z', [['CAFE PILAO 500G', 1, 19.9]]),
];
const ofertas: Oferta[] = [
  { id: 'o1', item: 'café pilão', mercado: 'Koch', precoOferta: 17.99, tipo: 'todos', fonte: 'site', criadoEm: '2026-11-25T10:00:00Z' },
];

describe('histórico de preço', () => {
  it('junta notas e preços anotados, mais recente primeiro', () => {
    const h = historicoPrecos('café', notas, ofertas);
    expect(h.map((r) => [r.mercado, r.preco])).toEqual([
      ['Koch', 17.99], ['Cooper', 21.5], ['Fort Atacadista', 18.9], ['Cooper', 19.9],
    ]);
    const r = resumoHistorico(h)!;
    expect(r.minimo).toBe(17.99);
    expect(r.ondeMinimo).toBe('Koch');
    expect(r.medio).toBe(19.57);
    expect(variacaoSobreMedia(21.5, h)).toBe(10);
    expect(resumoHistorico([])).toBeNull();
  });
});

describe('categorias', () => {
  it('usa o item da lista primeiro, depois palavras-chave', () => {
    expect(categoriaDoProduto('CAFE PILAO 500G', [item('Café', 'Bebidas')])).toBe('Bebidas');
    expect(categoriaDoProduto('DETERGENTE YPE 500ML', [])).toBe('Limpeza');
    expect(categoriaDoProduto('PEITO FRANGO KG', [])).toBe('Carnes');
    expect(categoriaDoProduto('QJO MUSS FATIADO', [])).toBe('Frios e laticínios');
    expect(categoriaDoProduto('XPTO 123', [])).toBe('Outros');
  });
});

describe('resumo de gastos', () => {
  it('soma o mês por mercado, categoria e item', () => {
    const r = resumoGastos(notas, '2026-11');
    expect(r.total).toBe(90.8);
    expect(r.compras).toBe(2);
    expect(r.porMercado.map((m) => [m.nome, m.valor])).toEqual([['Fort Atacadista', 45.3], ['Cooper', 45.5]].sort((a, b) => (b[1] as number) - (a[1] as number)));
    expect(r.porCategoria.find((c) => c.nome === 'Limpeza')!.valor).toBe(7.5);
    expect(r.maioresItens[0].nome).toBe('CAFE PILAO 500G');
  });

  it('meses e totais', () => {
    expect(ultimosMeses(new Date(2026, 0, 15), 3)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(nomeMes('2026-11')).toBe('nov/26');
    expect(totaisPorMes(notas, ['2026-10', '2026-11'])).toEqual([{ mes: '2026-10', total: 19.9 }, { mes: '2026-11', total: 90.8 }]);
  });

  it('orçamento', () => {
    expect(situacaoOrcamento(100, null, new Date(2026, 10, 15))).toBeNull();
    const s = situacaoOrcamento(850, 1000, new Date(2026, 10, 15))!;
    expect(s.nivel).toBe('atencao');
    expect(s.restante).toBe(150);
    expect(s.projecao).toBe(1700);
    expect(situacaoOrcamento(1200, 1000, new Date(2026, 10, 30))!.nivel).toBe('estourou');
  });
});

describe('frequentes e corredor', () => {
  it('mostra os mais colocados que não estão pendentes', () => {
    const freq = {
      cafe: { nome: 'Café', categoria: 'Mercearia' as const, vezes: 5, ultima: '2026-11-01' },
      leite: { nome: 'Leite', categoria: 'Frios e laticínios' as const, vezes: 3, ultima: '2026-11-02' },
      sal: { nome: 'Sal', categoria: 'Mercearia' as const, vezes: 1, ultima: '2026-11-02' },
    };
    expect(itensFrequentes(freq, [item('Café')]).map((f) => f.nome)).toEqual(['Leite']);
    expect(itensFrequentes(freq, [item('Café', 'Mercearia', true)]).map((f) => f.nome)).toEqual(['Café', 'Leite']);
  });

  it('ordena por corredor', () => {
    const g = porCorredor([item('Frango', 'Carnes'), item('Banana', 'Hortifrúti'), item('Arroz')]);
    expect(g.map((x) => x.categoria)).toEqual(['Hortifrúti', 'Mercearia', 'Carnes']);
  });
});
