import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuração do projeto Firebase "compra-certa" (Console > Configurações do projeto > Seus apps > Web).
 * Estes valores não são senha: identificam o projeto e vão dentro do app. A proteção está nas regras do Firestore
 * (arquivo firestore.rules, publicado no Console > Firestore > Regras).
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyAcnRwDnGHoNFovHWeh1g3e9RPvWgVFk_k',
  authDomain: 'compra-certa-66ad4.firebaseapp.com',
  projectId: 'compra-certa-66ad4',
  storageBucket: 'compra-certa-66ad4.firebasestorage.app',
  messagingSenderId: '787995482585',
  appId: '1:787995482585:web:3f1cebba39e7034de2e1c8',
};
