import { describe, expect, it } from '@jest/globals';
import { lerCupom, precosDaEtiqueta } from '../src/lib/cupom';

const cupomUmaLinha = `COOPERATIVA DE CONSUMO COOPER
CNPJ: 82.640.558/0001-04
Rua XV de Novembro, 1000 - Blumenau
DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
Codigo Descricao Qtde UN Vl Unit Vl Total
7891000053508 CAFE PILAO TRAD 500G 2 UN X 18,90 37,80
7896005800010 ARROZ TIO URBANO T1 5KG 1 UN X 26,9O 26,90
2001234 BANANA PRATA KG 1,235 KG X 5,99 7,40
QTD. TOTAL DE ITENS 3
VALOR TOTAL R$ 72,10
FORMA PAGAMENTO VALOR PAGO
Cartao de Debito 72,10
NFC-e n 123456 Serie 1 Emissao 27/11/2026 18:42:10`;

const cupomDuasLinhas = `SUPERMERCADO KOCH LTDA
001 7891234567890 DETERGENTE YPE NEUTRO 500ML
3 UN x 2,49 7,47
002 7899876543210 PAPEL HIG NEVE 12UN
1 PCT x 21,90 21,90
VALOR A PAGAR R$ 29,37
Emissao: 05/11/2026`;

describe('cupom por foto', () => {
  it('lê itens numa linha só, com erro de OCR no número', () => {
    const c = lerCupom(cupomUmaLinha);
    expect(c.mercado).toBe('Cooper');
    expect(c.itens.map((i) => [i.descricao, i.quantidade, i.unidade, i.valorUnitario, i.valorTotal])).toEqual([
      ['CAFE PILAO TRAD 500G', 2, 'UN', 18.9, 37.8],
      ['ARROZ TIO URBANO T1 5KG', 1, 'UN', 26.9, 26.9],
      ['BANANA PRATA KG', 1.235, 'KG', 5.99, 7.4],
    ]);
    expect(c.total).toBe(72.1);
    expect(c.somaItens).toBe(72.1);
    expect(new Date(c.data!).getDate()).toBe(27);
  });

  it('lê descrição numa linha e quantidade/preço na seguinte', () => {
    const c = lerCupom(cupomDuasLinhas);
    expect(c.mercado).toBe('Koch');
    expect(c.itens.map((i) => [i.descricao, i.quantidade, i.valorTotal])).toEqual([
      ['DETERGENTE YPE NEUTRO 500ML', 3, 7.47],
      ['PAPEL HIG NEVE 12UN', 1, 21.9],
    ]);
    expect(c.total).toBe(29.37);
    expect(new Date(c.data!).getMonth()).toBe(10);
  });

  it('texto sem cupom não inventa itens', () => {
    const c = lerCupom('foto borrada\n\n???');
    expect(c.itens).toEqual([]);
    expect(c.total).toBeNull();
  });
});

describe('etiqueta', () => {
  it('prefere o preço com fonte maior e junta centavos separados', () => {
    expect(
      precosDaEtiqueta([
        { texto: 'CAFE', altura: 20 },
        { texto: 'R$', altura: 30 },
        { texto: '12', altura: 90 },
        { texto: '99', altura: 40 },
        { texto: 'KG:', altura: 15 },
        { texto: '25,98', altura: 15 },
      ]),
    ).toEqual([12.99, 25.98]);
    expect(precosDaEtiqueta([{ texto: '7,49', altura: 50 }, { texto: '6.99', altura: 60 }])).toEqual([6.99, 7.49]);
  });
});

describe('etiqueta com ruído', () => {
  it('ignora aspas e símbolos colados no número', () => {
    expect(precosDaEtiqueta([{ texto: '“18,90', altura: 54 }, { texto: '37,80', altura: 9 }, { texto: 'R$12,49', altura: 30 }])).toEqual([18.9, 12.49, 37.8]);
  });
});

describe('cupom lido de foto real (OCR de imagem gerada)', () => {
  it('lê itens e corrige total de linha com dígito a mais', () => {
    const texto = `SUPERMERCADO KOCH LTDA
CNPJ 83.000 .000/0001-00
Rua Sete de Setembro 100 Blumenau SC
DOCUMENTO AUXILIAR DA NOTA FISCAL
DE CONSUMIDOR ELETRONICA
Codigo Descricao Qtde UN Vl Unit Vl Total
7891000053508 CAFE PILAO TRAD 500G
2 UN X 18,90 37,80
7896005800010 ARROZ TIO URBANO T1 5KG
1 UN X 26,90 26,90
2001234 BANANA PRATA KG
1,235 KG X 5,99 7,40
7891024134702 DETERGENTE YPE NEUTRO 500ML
3 UN X 2,49 7,497
QTD. TOTAL DE ITENS 4
VALOR TOTAL R$ 79,57
NFC-e n 123456 Serie 1 Emissao 27/11/2026 18:42:10`;
    const c = lerCupom(texto);
    expect(c.mercado).toBe('Koch');
    expect(c.itens.map((i) => i.valorTotal)).toEqual([37.8, 26.9, 7.4, 7.47]);
    expect(c.somaItens).toBe(79.57);
    expect(c.total).toBe(79.57);
  });
});

describe('etiqueta em várias escalas', () => {
  it('o valor lido certo em mais escalas vence a leitura errada isolada', () => {
    const p = [
      { texto: '16,90', altura: 162 }, { texto: '37,80', altura: 30 }, // 1000 px
      { texto: '18,90', altura: 162 }, { texto: '37,80', altura: 30 }, // 600 px (já na escala de 1000)
      { texto: '18,90', altura: 163 }, { texto: '37,80', altura: 29 }, // 380 px
    ];
    expect(precosDaEtiqueta(p)).toEqual([18.9, 16.9, 37.8]);
  });
});
