import { Alert, Platform } from 'react-native';

/** Pergunta de confirmação que funciona no celular e no navegador (onde Alert com botões não aparece). */
export function confirmar(titulo: string, mensagem: string, textoOk: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${mensagem}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoOk, style: 'destructive', onPress: aoConfirmar },
  ]);
}
