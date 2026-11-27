import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

export const cores = {
  fundo: '#F6F7F5',
  cartao: '#FFFFFF',
  texto: '#16201B',
  secundario: '#55615A',
  borda: '#E3E8E5',
  verde: '#1F7A4D',
  verdeClaro: '#E8F2EC',
  verdeEscuro: '#165C3A',
  alerta: '#FFF4E5',
  alertaTexto: '#6B3A0B',
  azulClaro: '#E8EEF8',
  azulTexto: '#1F4E8C',
  perigo: '#B42318',
};

export function Secao({ titulo, children, style }: { titulo: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6, marginTop: 16 }, style]}>
      <Text style={s.secao}>{titulo}</Text>
      {children}
    </View>
  );
}

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.cartao, style]}>{children}</View>;
}

export function Botao({
  titulo,
  onPress,
  tipo = 'primario',
  desabilitado,
}: {
  titulo: string;
  onPress: () => void;
  tipo?: 'primario' | 'secundario';
  desabilitado?: boolean;
}) {
  const prim = tipo === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        s.botao,
        prim ? { backgroundColor: cores.verde } : { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda },
        (pressed || desabilitado) && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: prim ? '#FFFFFF' : cores.texto, fontWeight: '600', fontSize: 16 }}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo(props: TextInputProps & { rotulo: string }) {
  const { rotulo, style, ...rest } = props;
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Text style={{ fontSize: 12, color: cores.secundario, fontWeight: '500' }}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor="#8A968F"
        style={[s.campo, style]}
        {...rest}
      />
    </View>
  );
}

export function Aviso({ children, tipo = 'alerta' }: { children: ReactNode; tipo?: 'alerta' | 'info' }) {
  const info = tipo === 'info';
  return (
    <View style={[s.aviso, { backgroundColor: info ? cores.verdeClaro : cores.alerta }]}>
      <Text style={{ color: info ? cores.verdeEscuro : cores.alertaTexto, fontSize: 13, lineHeight: 18 }}>{children}</Text>
    </View>
  );
}

export function Chip({ texto, ativo, onPress }: { texto: string; ativo?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      onPress={onPress}
      style={[
        s.chip,
        ativo ? { backgroundColor: cores.verdeClaro, borderColor: cores.verdeClaro } : { borderColor: '#8A968F', borderStyle: 'dashed' },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: ativo ? cores.verdeEscuro : '#3D4842' }}>{texto}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 26, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 13, color: cores.secundario, marginTop: 2 },
  secao: { fontSize: 12, fontWeight: '600', color: cores.secundario, textTransform: 'uppercase', letterSpacing: 0.7 },
  cartao: { backgroundColor: cores.cartao, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#EEF1EF', minHeight: 48 },
  botao: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  campo: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#D5DBD7', backgroundColor: cores.cartao, paddingHorizontal: 12, fontSize: 15, color: cores.texto },
  aviso: { padding: 12, borderRadius: 12, marginTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, minHeight: 36, justifyContent: 'center' },
  textoItem: { fontSize: 15, fontWeight: '500', color: cores.texto },
  detalhe: { fontSize: 12, color: cores.secundario },
});
