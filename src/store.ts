import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { novoId } from './lib/logic';
import { Categoria, ItemLista, NotaFiscal, Oferta } from './lib/types';

interface Estado {
  lista: ItemLista[];
  notas: NotaFiscal[];
  ofertas: Oferta[];
  clubes: string[]; // mercados em que o usuário é cadastrado no clube/cooperativa

  adicionarItem: (nome: string, quantidade: string, categoria: Categoria) => void;
  alternarComprado: (id: string) => void;
  removerItem: (id: string) => void;
  limparComprados: () => void;

  salvarNota: (nota: Omit<NotaFiscal, 'id'>) => NotaFiscal;
  removerNota: (id: string) => void;

  salvarOferta: (oferta: Omit<Oferta, 'id'>) => void;
  removerOferta: (id: string) => void;
  alternarClube: (mercado: string) => void;
}

export const useLoja = create<Estado>()((set, get) => ({
      lista: [],
      notas: [],
      ofertas: [],
      clubes: [],

      adicionarItem: (nome, quantidade, categoria) => {
        const limpo = nome.trim();
        if (!limpo) return;
        set((s) => ({
          lista: [
            ...s.lista,
            { id: novoId(), nome: limpo, quantidade: quantidade.trim(), categoria, comprado: false, criadoEm: new Date().toISOString() },
          ],
        }));
      },
      alternarComprado: (id) =>
        set((s) => ({ lista: s.lista.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i)) })),
      removerItem: (id) => set((s) => ({ lista: s.lista.filter((i) => i.id !== id) })),
      limparComprados: () => set((s) => ({ lista: s.lista.filter((i) => !i.comprado) })),

      salvarNota: (nota) => {
        const nova = { ...nota, id: novoId() };
        set((s) => ({ notas: [nova, ...s.notas] }));
        return nova;
      },
      removerNota: (id) => set((s) => ({ notas: s.notas.filter((n) => n.id !== id) })),

      salvarOferta: (oferta) => set((s) => ({ ofertas: [{ ...oferta, id: novoId() }, ...s.ofertas] })),
      removerOferta: (id) => set((s) => ({ ofertas: s.ofertas.filter((o) => o.id !== id) })),
      alternarClube: (mercado) => {
        const tem = get().clubes.includes(mercado);
        set((s) => ({ clubes: tem ? s.clubes.filter((c) => c !== mercado) : [...s.clubes, mercado] }));
      },
}));

// Salvamento no celular (AsyncStorage). Feito à mão, sem zustand/middleware,
// para funcionar também no Expo Snack. Formato compatível com o persist do zustand.
const CHAVE = 'lista-compras-v1';
let carregado = false;

AsyncStorage.getItem(CHAVE)
  .then((json) => {
    if (!json) return;
    const salvo = JSON.parse(json)?.state;
    if (salvo) {
      useLoja.setState({
        lista: salvo.lista ?? [],
        notas: salvo.notas ?? [],
        ofertas: salvo.ofertas ?? [],
        clubes: salvo.clubes ?? [],
      });
    }
  })
  .catch(() => {})
  .finally(() => {
    carregado = true;
  });

useLoja.subscribe((s) => {
  if (!carregado) return; // não sobrescreve os dados salvos antes de lê-los
  const { lista, notas, ofertas, clubes } = s;
  AsyncStorage.setItem(CHAVE, JSON.stringify({ state: { lista, notas, ofertas, clubes }, version: 0 })).catch(() => {});
});
