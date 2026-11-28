import { describe, expect, it } from '@jest/globals';
import { circuloPelaCor, itensDoPrint, itensDoTexto, separarQuantidade } from '../src/lib/importarNotas';

// Linhas lidas do print real do app Notas (OCR do recorte sem a coluna dos círculos)
const linhas = [
  { texto: '08 PIE 55)', confianca: 9, circulo: null },
  { texto: 'À ..', confianca: 53, circulo: 'vazio' },
  { texto: 'Saco de lixo', confianca: 96, circulo: 'marcado' },
  { texto: 'Água', confianca: 96, circulo: 'marcado' },
  { texto: '2 Milho lata', confianca: 96, circulo: 'marcado' },
  { texto: 'Lemon paper', confianca: 96, circulo: 'vazio' },
  { texto: 'Tempero baiano', confianca: 93, circulo: 'vazio' },
  { texto: '200g coco ralado em flocos (vê se', confianca: 95, circulo: 'marcado' },
  { texto: 'acha sem doce', confianca: 96, circulo: null },
  { texto: '1 barra de chocolate meio amargo', confianca: 96, circulo: 'marcado' },
  { texto: '- 2 O o', confianca: 66, circulo: 'marcado' },
  { texto: '2 cenouras', confianca: 96, circulo: 'marcado' },
] as const;

describe('importar do Notas', () => {
  it('lê o print: marcados, não marcados, continuação e lixo', () => {
    const r = itensDoPrint(linhas.map((l) => ({ ...l })));
    expect(r.filter((i) => i.marcado).map((i) => [i.nome, i.quantidade])).toEqual([
      ['Saco de lixo', ''],
      ['Água', ''],
      ['Milho lata', '2'],
      ['Coco ralado em flocos (vê se acha sem doce', '200g'],
      ['Barra de chocolate meio amargo', '1'],
      ['Cenouras', '2'],
    ]);
    expect(r.filter((i) => !i.marcado).map((i) => i.nome)).toEqual(['Lemon paper', 'Tempero baiano']);
  });

  it('quantidade no começo', () => {
    expect(separarQuantidade('3 creme de leite')).toEqual({ nome: 'creme de leite', quantidade: '3' });
    expect(separarQuantidade('1,5 kg carne moída')).toEqual({ nome: 'carne moída', quantidade: '1,5kg' });
    expect(separarQuantidade('Leite')).toEqual({ nome: 'Leite', quantidade: '' });
  });

  it('texto colado com e sem marcadores', () => {
    const r = itensDoTexto('- [x] Leite\n- [ ] Pão\n✓ 2 Ovos\n\nArroz');
    expect(r.map((i) => [i.nome, i.marcado])).toEqual([['Leite', true], ['Pão', false], ['Ovos', true], ['Arroz', false]]);
  });

  it('cor da faixa da esquerda', () => {
    expect(circuloPelaCor(1500, 1800, 67)).toBe('marcado');
    expect(circuloPelaCor(0, 400, 67)).toBe('vazio');
    expect(circuloPelaCor(0, 3, 40)).toBeNull();
  });
});
