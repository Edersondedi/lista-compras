import { describe, expect, it } from '@jest/globals';
import { gerarLink, lerLista, separarNovos, textoParaEnviar } from '../src/lib/compartilhar';
import { ItemLista } from '../src/lib/types';

const item = (nome: string, quantidade = '', comprado = false): ItemLista => ({
  id: nome, nome, quantidade, categoria: 'Mercearia', comprado, criadoEm: '2026-11-27T00:00:00Z',
});

describe('compartilhar lista', () => {
  const lista = [item('Café', '2 un'), item('Arroz tipo 1', '5 kg'), item('Banana', '', true)];

  it('gera link só com itens pendentes e lê de volta', () => {
    const link = gerarLink(lista);
    expect(link.startsWith('https://edersondedi.github.io/lista-compras/?lista=')).toBe(true);
    expect(lerLista(link)).toEqual([
      { nome: 'Café', quantidade: '2 un', categoria: 'Mercearia' },
      { nome: 'Arroz tipo 1', quantidade: '5 kg', categoria: 'Mercearia' },
    ]);
  });

  it('lê a mensagem inteira do WhatsApp', () => {
    expect(lerLista(textoParaEnviar(lista))!.length).toBe(2);
    expect(textoParaEnviar(lista)).toContain('• Café (2 un)');
  });

  it('rejeita texto qualquer', () => {
    expect(lerLista('oi, tudo bem?')).toBeNull();
    expect(lerLista('?lista=%5B%5D')).toBeNull();
  });

  it('separa novos e repetidos ignorando acento', () => {
    const r = separarNovos(lerLista(gerarLink([item('cafe'), item('Leite')]))!, lista);
    expect(r.novos.map((x) => x.nome)).toEqual(['Leite']);
    expect(r.repetidos.map((x) => x.nome)).toEqual(['cafe']);
  });
});
