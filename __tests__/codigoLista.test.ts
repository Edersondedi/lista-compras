import { describe, expect, it } from '@jest/globals';
import { diferencas, doMapa, gerarCodigo, lerCodigo, meusItensQueFaltam, mostrarCodigo, paraMapa } from '../src/lib/codigoLista';
import { ItemLista } from '../src/lib/types';

const item = (id: string, nome: string, extra: Partial<ItemLista> = {}): ItemLista => ({
  id, nome, quantidade: '', categoria: 'Mercearia', comprado: false, criadoEm: `2026-11-27T10:00:0${id}Z`, ...extra,
});

describe('código da lista', () => {
  it('gera códigos válidos e legíveis', () => {
    for (let i = 0; i < 200; i++) expect(lerCodigo(gerarCodigo())).not.toBeNull();
    expect(mostrarCodigo('K7P2X9AB')).toBe('K7P2-X9AB');
  });

  it('lê código digitado ou link', () => {
    expect(lerCodigo(' k7p2-x9ab ')).toBe('K7P2X9AB');
    expect(lerCodigo('Entra aí: https://edersondedi.github.io/lista-compras/?codigo=K7P2-X9AB')).toBe('K7P2X9AB');
    expect(lerCodigo('K7P2X9A')).toBeNull(); // curto
    expect(lerCodigo('K7P2X9A0')).toBeNull(); // 0 não existe no alfabeto
  });
});

describe('sincronização item a item', () => {
  it('detecta inclusão, alteração e remoção', () => {
    const antes = [item('1', 'Café'), item('2', 'Leite')];
    const depois = [item('1', 'Café', { comprado: true }), item('3', 'Pão')];
    const d = diferencas(antes, depois);
    expect(d.gravar.map((i) => i.id)).toEqual(['1', '3']);
    expect(d.apagar).toEqual(['2']);
    expect(diferencas(depois, depois)).toEqual({ gravar: [], apagar: [] });
  });

  it('mapa ida e volta mantém a ordem de criação', () => {
    const l = [item('2', 'B'), item('1', 'A')];
    expect(doMapa(paraMapa(l)).map((i) => i.id)).toEqual(['1', '2']);
    expect(doMapa(undefined)).toEqual([]);
  });

  it('ao entrar, só leva o que a lista da casa ainda não tem', () => {
    const minha = [item('1', 'cafe'), item('2', 'Arroz'), item('3', 'Sabão', { comprado: true })];
    const remota = [item('9', 'Café')];
    expect(meusItensQueFaltam(minha, remota).map((i) => i.nome)).toEqual(['Arroz']);
  });
});
