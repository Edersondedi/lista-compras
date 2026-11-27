import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuração do projeto Firebase "compra-certa" (Console > Configurações do projeto > Seus apps > Web).
 * Estes valores não são senha: identificam o projeto e vão dentro do app. A proteção está nas regras do Firestore.
 * Enquanto estiver null, a lista compartilhada fica desligada e o app funciona só neste aparelho.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null;
