import { describe, expect, it } from '@jest/globals';
import { compararCompra, notaProvavel } from '../src/lib/conferencia';
import { NotaFiscal, RegistroMercado } from '../src/lib/types';

const registro: RegistroMercado = {
  id: 'r1', mercado: 'Fort', data: '2026-11-28T14:00:00Z', semPreco: [],
  itens: [
    { nome: 'Café', quantidade: '2', preco: 37.8 },
    { nome: 'Banana', quantidade: '', preco: 7 },
    { nome: 'Pão', quantidade: '', preco: 9.9 },
  ],
  total: 54.7,
};
const prod = (descricao: string, valorTotal: number) => ({ descricao, quantidade: 1, unidade: 'UN', valorUnitario: valorTotal, valorTotal });
const nota: NotaFiscal = {
  id: 'n1', mercado: 'Fort Atacadista', data: '2026-11-28T14:20:00Z', origem: 'foto',
  itens: [prod('CAFE PILAO 500G', 18.9), prod('BANANA PRATA KG', 7.4), prod('CAFE PILAO 500G', 18.9), prod('SACOLA', 0.25)],
  total: 45.45,
};

describe('conferir compra do mercado com a nota', () => {
  it('liga itens, soma repetidos e acha diferenças', () => {
    const c = compararCompra(registro, nota);
    expect(c.linhas.map((l) => [l.nome, l.cobrado, l.diferenca])).toEqual([
      ['Café', 37.8, 0],
      ['Banana', 7.4, 0.4],
      ['Pão', null, null],
    ]);
    expect(c.naoAnotados.map((i) => i.descricao)).toEqual(['SACOLA']);
    expect(c.cobradoAMais).toBe(0.4);
    expect(c.diferencaTotal).toBe(-9.25);
  });

  it('acha a nota do mesmo mercado e dia', () => {
    const outra = { ...nota, id: 'n2', mercado: 'Cooper' };
    const velha = { ...nota, id: 'n3', data: '2026-11-20T10:00:00Z' };
    expect(notaProvavel(registro, [outra, velha, nota])?.id).toBe('n1');
    expect(notaProvavel(registro, [outra, velha])).toBeNull();
  });
});
