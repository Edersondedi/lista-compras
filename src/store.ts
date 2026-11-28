import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { normalizar, novoId } from './lib/logic';
import { Categoria, ItemLista, NotaFiscal, Oferta } from './lib/types';

interface Estado {
  lista: ItemLista[];
  notas: NotaFiscal[];
  ofertas: Oferta[];
  clubes: string[]; // mercados em que o usuário é cadastrado no clube/cooperativa

  /** Meta de gasto do mês, em reais (null = sem meta). Compartilhada na lista da casa. */
  orcamento: number | null;
  /** Quantas vezes cada item já foi colocado na lista (chave = nome normalizado). Só neste aparelho. */
  frequencia: Record<string, { nome: string; categoria: Categoria; vezes: number; ultima: string }>;
  /** Compra em andamento no modo "No mercado" (só neste aparelho). */
  carrinho: { mercado: string; precos: Record<string, string>; aberto: boolean } | null;
  definirOrcamento: (valor: number | null) => void;
  definirCarrinho: (c: { mercado: string; precos: Record<string, string>; aberto: boolean } | null) => void;
  pronto: boolean;
  /** Código da lista compartilhada da casa (null = lista só neste aparelho). */
  codigoLista: string | null;
  statusSync: 'desligado' | 'conectando' | 'ok' | 'erro';
  adicionarItem: (nome: string, quantidade: string, categoria: Categoria) => void;
  receberItens: (itens: { nome: string; quantidade: string; categoria: Categoria }[]) => void;
  alternarComprado: (id: string) => void;
  removerItem: (id: string) => void;
  editarItem: (id: string, mudancas: { nome: string; quantidade: string; categoria: Categoria }) => void;
  restaurarItem: (item: ItemLista) => void;
  limparComprados: () => void;

  salvarNota: (nota: Omit<NotaFiscal, 'id'>) => NotaFiscal;
  removerNota: (id: string) => void;
  renomearMercado: (id: string, mercado: string) => void;
  editarNota: (id: string, mudancas: { mercado?: string; data?: string }) => void;

  salvarOferta: (oferta: Omit<Oferta, 'id'>) => void;
  removerOferta: (id: string) => void;
  editarOferta: (id: string, preco: number) => void;
  corrigirPrecoNota: (notaId: string, indice: number, valorUnitario: number) => void;
  alternarClube: (mercado: string) => void;
}

function contar(freq: Estado['frequencia'], itens: { nome: string; categoria: Categoria }[]): Estado['frequencia'] {
  const novo = { ...freq };
  const agora = new Date().toISOString();
  for (const i of itens) {
    const k = normalizar(i.nome);
    if (!k) continue;
    novo[k] = { nome: i.nome.trim(), categoria: i.categoria, vezes: (novo[k]?.vezes ?? 0) + 1, ultima: agora };
  }
  return novo;
}

export const useLoja = create<Estado>()((set, get) => ({
      lista: [],
      notas: [],
      ofertas: [],
      clubes: [],
      pronto: false,
      orcamento: null,
      frequencia: {},
      carrinho: null,
      definirOrcamento: (valor) => set({ orcamento: valor && valor > 0 ? valor : null }),
      definirCarrinho: (c) => set({ carrinho: c }),
      codigoLista: null,
      statusSync: 'desligado',

      receberItens: (itens) => {
        const agora = new Date().toISOString();
        set((s) => ({
          frequencia: contar(s.frequencia, itens),
          lista: [
            ...s.lista,
            ...itens.map((i) => ({ id: novoId(), nome: i.nome, quantidade: i.quantidade, categoria: i.categoria, comprado: false, criadoEm: agora })),
          ],
        }));
      },

      adicionarItem: (nome, quantidade, categoria) => {
        const limpo = nome.trim();
        if (!limpo) return;
        set((s) => ({
          frequencia: contar(s.frequencia, [{ nome: limpo, categoria }]),
          lista: [
            ...s.lista,
            { id: novoId(), nome: limpo, quantidade: quantidade.trim(), categoria, comprado: false, criadoEm: new Date().toISOString() },
          ],
        }));
      },
      alternarComprado: (id) =>
        set((s) => ({ lista: s.lista.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i)) })),
      removerItem: (id) => set((s) => ({ lista: s.lista.filter((i) => i.id !== id) })),
      editarItem: (id, m) =>
        set((s) => ({
          lista: s.lista.map((i) =>
            i.id === id ? { ...i, nome: m.nome.trim() || i.nome, quantidade: m.quantidade.trim(), categoria: m.categoria } : i,
          ),
        })),
      restaurarItem: (item) => set((s) => (s.lista.some((i) => i.id === item.id) ? s : { lista: [...s.lista, item] })),
      limparComprados: () => set((s) => ({ lista: s.lista.filter((i) => !i.comprado) })),

      salvarNota: (nota) => {
        const nova = { ...nota, id: novoId() };
        set((s) => ({ notas: [nova, ...s.notas] }));
        return nova;
      },
      removerNota: (id) => set((s) => ({ notas: s.notas.filter((n) => n.id !== id) })),
      renomearMercado: (id, mercado) =>
        set((s) => ({ notas: s.notas.map((n) => (n.id === id && mercado.trim() ? { ...n, mercado: mercado.trim() } : n)) })),

      editarNota: (id, mudancas) =>
        set((s) => ({
          notas: s.notas.map((n) =>
            n.id === id
              ? { ...n, ...(mudancas.mercado?.trim() ? { mercado: mudancas.mercado.trim() } : {}), ...(mudancas.data ? { data: mudancas.data } : {}) }
              : n,
          ),
        })),

      salvarOferta: (oferta) => set((s) => ({ ofertas: [{ ...oferta, id: novoId(), criadoEm: new Date().toISOString() }, ...s.ofertas] })),
      removerOferta: (id) => set((s) => ({ ofertas: s.ofertas.filter((o) => o.id !== id) })),
      editarOferta: (id, preco) => set((s) => ({ ofertas: s.ofertas.map((o) => (o.id === id ? { ...o, precoOferta: preco } : o)) })),
      corrigirPrecoNota: (notaId, indice, valorUnitario) =>
        set((s) => ({
          notas: s.notas.map((n) => {
            if (n.id !== notaId || !n.itens[indice]) return n;
            const antigo = n.itens[indice];
            const valorTotal = Math.round(antigo.quantidade * valorUnitario * 100) / 100;
            const itens = n.itens.map((it, k) => (k === indice ? { ...it, valorUnitario, valorTotal } : it));
            return { ...n, itens, total: Math.round((n.total - antigo.valorTotal + valorTotal) * 100) / 100 };
          }),
        })),
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
        codigoLista: salvo.codigoLista ?? null,
        orcamento: salvo.orcamento ?? null,
        frequencia: salvo.frequencia ?? {},
        carrinho: salvo.carrinho ?? null,
      });
    }
  })
  .catch(() => {})
  .finally(() => {
    carregado = true;
    useLoja.setState({ pronto: true });
  });

useLoja.subscribe((s) => {
  if (!carregado) return; // não sobrescreve os dados salvos antes de lê-los
  const { lista, notas, ofertas, clubes, codigoLista, orcamento, frequencia, carrinho } = s;
  const state = { lista, notas, ofertas, clubes, codigoLista, orcamento, frequencia, carrinho };
  AsyncStorage.setItem(CHAVE, JSON.stringify({ state, version: 0 })).catch(() => {});
});
