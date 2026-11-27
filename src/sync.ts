import { initializeApp } from 'firebase/app';
import {
  CollectionReference,
  DocumentReference,
  Firestore,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { diferencas, doMapa, gerarCodigo, juntarPorId, meusItensQueFaltam, ordenarNotas, ordenarOfertas, paraMapa } from './lib/codigoLista';
import { FIREBASE_CONFIG } from './lib/firebaseConfig';
import { ItemLista, NotaFiscal, Oferta } from './lib/types';
import { useLoja } from './store';

// Estrutura no Firestore, tudo debaixo do código da lista:
//   /listas/{CODIGO}                 { itens: { [id]: ItemLista }, atualizadoEm }
//   /listas/{CODIGO}/notas/{id}      NotaFiscal
//   /listas/{CODIGO}/ofertas/{id}    Oferta (preços anotados)
//   /listas/{CODIGO}/config/casa     { clubes, orcamento }
// Cada mudança grava só o registro alterado, para duas pessoas mexendo ao mesmo tempo não apagarem uma à outra.

export const syncDisponivel = FIREBASE_CONFIG !== null;

let db: Firestore | null = null;
let alvo: { lista: DocumentReference; notas: CollectionReference; ofertas: CollectionReference; config: DocumentReference } | null = null;
let ouvintes: (() => void)[] = [];
let aplicandoRemoto = false;
let iniciado = false;

function banco(): Firestore {
  if (!FIREBASE_CONFIG) throw new Error('Lista compartilhada ainda não configurada.');
  if (!db) db = initializeFirestore(initializeApp(FIREBASE_CONFIG), { ignoreUndefinedProperties: true });
  return db;
}

function refs(codigo: string) {
  const lista = doc(banco(), 'listas', codigo);
  return { lista, notas: collection(lista, 'notas'), ofertas: collection(lista, 'ofertas'), config: doc(lista, 'config', 'casa') };
}

function aplicar(parte: Partial<ReturnType<typeof useLoja.getState>>) {
  aplicandoRemoto = true;
  useLoja.setState(parte);
  aplicandoRemoto = false;
}

const falhou = () => useLoja.setState({ statusSync: 'erro' });

function gravarItens(ref: DocumentReference, gravar: ItemLista[], apagar: string[]) {
  if (!gravar.length && !apagar.length) return Promise.resolve();
  const campos: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
  for (const i of gravar) campos[`itens.${i.id}`] = i;
  for (const id of apagar) campos[`itens.${id}`] = deleteField();
  return updateDoc(ref, campos);
}

/** Grava/apaga registros de uma subcoleção em lotes (máx. 500 operações por lote no Firestore). */
async function gravarRegistros<T extends { id: string }>(col: CollectionReference, gravar: T[], apagar: string[] = []) {
  const ops = [...gravar.map((g) => ({ g })), ...apagar.map((a) => ({ a }))];
  for (let i = 0; i < ops.length; i += 450) {
    const lote = writeBatch(banco());
    for (const op of ops.slice(i, i + 450)) {
      if ('g' in op) lote.set(doc(col, op.g.id), op.g);
      else lote.delete(doc(col, op.a));
    }
    await lote.commit();
  }
}

const gravarConfig = (ref: DocumentReference, clubes: string[], orcamento: number | null) => setDoc(ref, { clubes, orcamento });

function ouvir(codigo: string) {
  ouvintes.forEach((f) => f());
  alvo = refs(codigo);
  useLoja.setState({ statusSync: 'conectando' });
  ouvintes = [
    onSnapshot(
      alvo.lista,
      (snap) => {
        if (!snap.exists()) return falhou();
        aplicar({ lista: doMapa(snap.data().itens), statusSync: 'ok' });
      },
      falhou,
    ),
    onSnapshot(alvo.notas, (snap) => aplicar({ notas: ordenarNotas(snap.docs.map((d) => d.data() as NotaFiscal)) }), falhou),
    onSnapshot(alvo.ofertas, (snap) => aplicar({ ofertas: ordenarOfertas(snap.docs.map((d) => d.data() as Oferta)) }), falhou),
    onSnapshot(
      alvo.config,
      (snap) => {
        if (!snap.exists()) return;
        const c = snap.data();
        aplicar({ clubes: Array.isArray(c.clubes) ? c.clubes : [], orcamento: typeof c.orcamento === 'number' ? c.orcamento : null });
      },
      falhou,
    ),
  ];
}

/** Liga a sincronização (uma vez, depois que os dados salvos no aparelho foram lidos). */
export function iniciarSync() {
  if (iniciado || !syncDisponivel) return;
  iniciado = true;
  useLoja.subscribe((s, antes) => {
    if (aplicandoRemoto || !alvo || !s.codigoLista) return;
    if (s.lista !== antes.lista) {
      const d = diferencas(antes.lista, s.lista);
      gravarItens(alvo.lista, d.gravar, d.apagar).catch(falhou);
    }
    if (s.notas !== antes.notas) {
      const d = diferencas(antes.notas, s.notas);
      gravarRegistros(alvo.notas, d.gravar, d.apagar).catch(falhou);
    }
    if (s.ofertas !== antes.ofertas) {
      const d = diferencas(antes.ofertas, s.ofertas);
      gravarRegistros(alvo.ofertas, d.gravar, d.apagar).catch(falhou);
    }
    if (s.clubes !== antes.clubes || s.orcamento !== antes.orcamento) {
      gravarConfig(alvo.config, s.clubes, s.orcamento).catch(falhou);
    }
  });
  const codigo = useLoja.getState().codigoLista;
  if (codigo) ouvir(codigo);
}

/** Cria a lista da casa com tudo o que já está neste aparelho. Retorna o código. */
export async function criarListaCompartilhada(): Promise<string> {
  let codigo = gerarCodigo();
  for (let t = 0; t < 3 && (await getDoc(refs(codigo).lista)).exists(); t++) codigo = gerarCodigo();
  const r = refs(codigo);
  const s = useLoja.getState();
  await setDoc(r.lista, { itens: paraMapa(s.lista), atualizadoEm: serverTimestamp() });
  await gravarRegistros(r.notas, s.notas);
  await gravarRegistros(r.ofertas, s.ofertas);
  await gravarConfig(r.config, s.clubes, s.orcamento);
  useLoja.setState({ codigoLista: codigo });
  ouvir(codigo);
  return codigo;
}

/** Entra numa lista existente. Leva junto os itens pendentes, notas e preços deste aparelho que ela não tem. */
export async function entrarNaLista(codigo: string): Promise<number> {
  const r = refs(codigo);
  const snap = await getDoc(r.lista);
  if (!snap.exists()) throw new Error('Não encontrei uma lista com esse código. Confira as letras e números.');
  const s = useLoja.getState();
  const faltam = meusItensQueFaltam(s.lista, doMapa(snap.data().itens));
  await gravarItens(r.lista, faltam, []);
  const [notasRemotas, ofertasRemotas, config] = await Promise.all([getDocs(r.notas), getDocs(r.ofertas), getDoc(r.config)]);
  await gravarRegistros(r.notas, juntarPorId(s.notas, notasRemotas.docs.map((d) => d.data() as NotaFiscal)).subir);
  await gravarRegistros(r.ofertas, juntarPorId(s.ofertas, ofertasRemotas.docs.map((d) => d.data() as Oferta)).subir);
  const c = config.exists() ? config.data() : null;
  const clubes = [...new Set([...(Array.isArray(c?.clubes) ? c.clubes : []), ...s.clubes])];
  await gravarConfig(r.config, clubes, typeof c?.orcamento === 'number' ? c.orcamento : s.orcamento);
  useLoja.setState({ codigoLista: codigo });
  ouvir(codigo);
  return faltam.length;
}

/** Desliga este aparelho da lista da casa. Tudo o que está aqui continua salvo. */
export function sairDaLista() {
  ouvintes.forEach((f) => f());
  ouvintes = [];
  alvo = null;
  useLoja.setState({ codigoLista: null, statusSync: 'desligado' });
}
