import { initializeApp } from 'firebase/app';
import {
  DocumentReference,
  Firestore,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { diferencas, doMapa, gerarCodigo, meusItensQueFaltam, paraMapa } from './lib/codigoLista';
import { FIREBASE_CONFIG } from './lib/firebaseConfig';
import { ItemLista } from './lib/types';
import { useLoja } from './store';

// Documento /listas/{CODIGO} = { itens: { [id]: ItemLista }, atualizadoEm }.
// Cada mudança grava só os itens alterados, para duas pessoas mexendo ao mesmo tempo não apagarem uma à outra.

export const syncDisponivel = FIREBASE_CONFIG !== null;

let db: Firestore | null = null;
let ref: DocumentReference | null = null;
let pararDeOuvir: (() => void) | null = null;
let aplicandoRemoto = false;
let iniciado = false;

function banco(): Firestore {
  if (!FIREBASE_CONFIG) throw new Error('Lista compartilhada ainda não configurada.');
  if (!db) db = getFirestore(initializeApp(FIREBASE_CONFIG));
  return db;
}

const refDe = (codigo: string) => doc(banco(), 'listas', codigo);

function gravarItens(alvo: DocumentReference, gravar: ItemLista[], apagar: string[]) {
  if (!gravar.length && !apagar.length) return Promise.resolve();
  const campos: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
  for (const i of gravar) campos[`itens.${i.id}`] = i;
  for (const id of apagar) campos[`itens.${id}`] = deleteField();
  return updateDoc(alvo, campos);
}

function ouvir(codigo: string) {
  pararDeOuvir?.();
  ref = refDe(codigo);
  useLoja.setState({ statusSync: 'conectando' });
  pararDeOuvir = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        useLoja.setState({ statusSync: 'erro' });
        return;
      }
      aplicandoRemoto = true;
      useLoja.setState({ lista: doMapa(snap.data().itens), statusSync: 'ok' });
      aplicandoRemoto = false;
    },
    () => useLoja.setState({ statusSync: 'erro' }),
  );
}

/** Liga a sincronização (uma vez, depois que os dados salvos no aparelho foram lidos). */
export function iniciarSync() {
  if (iniciado || !syncDisponivel) return;
  iniciado = true;
  useLoja.subscribe((s, antes) => {
    if (aplicandoRemoto || !ref || !s.codigoLista || s.lista === antes.lista) return;
    const { gravar, apagar } = diferencas(antes.lista, s.lista);
    gravarItens(ref, gravar, apagar).catch(() => useLoja.setState({ statusSync: 'erro' }));
  });
  const codigo = useLoja.getState().codigoLista;
  if (codigo) ouvir(codigo);
}

/** Cria a lista da casa a partir da lista atual deste aparelho. Retorna o código. */
export async function criarListaCompartilhada(): Promise<string> {
  let codigo = gerarCodigo();
  for (let t = 0; t < 3 && (await getDoc(refDe(codigo))).exists(); t++) codigo = gerarCodigo();
  await setDoc(refDe(codigo), { itens: paraMapa(useLoja.getState().lista), atualizadoEm: serverTimestamp() });
  useLoja.setState({ codigoLista: codigo });
  ouvir(codigo);
  return codigo;
}

/** Entra numa lista existente. Os itens pendentes deste aparelho que ela não tem são acrescentados. */
export async function entrarNaLista(codigo: string): Promise<number> {
  const alvo = refDe(codigo);
  const snap = await getDoc(alvo);
  if (!snap.exists()) throw new Error('Não encontrei uma lista com esse código. Confira as letras e números.');
  const faltam = meusItensQueFaltam(useLoja.getState().lista, doMapa(snap.data().itens));
  await gravarItens(alvo, faltam, []);
  useLoja.setState({ codigoLista: codigo });
  ouvir(codigo);
  return faltam.length;
}

/** Desliga este aparelho da lista da casa. A lista atual continua salva aqui. */
export function sairDaLista() {
  pararDeOuvir?.();
  pararDeOuvir = null;
  ref = null;
  useLoja.setState({ codigoLista: null, statusSync: 'desligado' });
}
