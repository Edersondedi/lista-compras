import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { mercadosConhecidos, numeroOuNulo, reais } from './lib/logic';
import { useLoja } from './store';
import { Botao, Campo, Chip, cores, s } from './ui';

// Página do Menor Preço Brasil na App Store (o app não tem link de busca conhecido).
const MENOR_PRECO_IOS = 'https://apps.apple.com/br/app/menor-preco-brasil/id1483644418';
const MERCADOS_PADRAO = ['Cooper', 'Koch', 'Unidos', 'Fort'];

/** Painel aberto embaixo de um item da lista: buscar no Menor Preço e anotar o preço visto. */
export function PrecoRapido({ item, aoFechar }: { item: string; aoFechar: () => void }) {
  const { notas, ofertas, clubes, salvarOferta } = useLoja();
  const mercados = [...new Set([...MERCADOS_PADRAO, ...mercadosConhecidos(notas, ofertas), ...clubes])].filter(
    (m) => !m.startsWith('Mercado ('),
  );
  const [mercado, setMercado] = useState('');
  const [preco, setPreco] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const valor = numeroOuNulo(preco);

  async function buscar() {
    try {
      await Clipboard.setStringAsync(item);
      setAviso(`"${item}" copiado. No Menor Preço, toque na busca e cole.`);
    } catch {
      setAviso(`Busque por "${item}" no Menor Preço.`);
    }
    Linking.openURL(MENOR_PRECO_IOS).catch(() => {});
  }

  function salvar() {
    if (!mercado.trim() || valor === null) return;
    const validade = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    salvarOferta({ item, mercado: mercado.trim(), precoOferta: valor, tipo: 'todos', validade, fonte: 'menorpreco' });
    setAviso(`${reais(valor)} no ${mercado.trim()} anotado (vale por 3 dias na comparação).`);
    setPreco('');
  }

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, gap: 10, backgroundColor: '#FAFBFA', borderBottomWidth: 1, borderBottomColor: '#EEF1EF' }}>
      <Botao tipo="secundario" titulo="Buscar no Menor Preço Brasil" onPress={buscar} />
      <Text style={[s.detalhe, { lineHeight: 17 }]}>Viu um preço? Anote aqui para entrar na comparação:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {mercados.map((m) => (
          <Chip key={m} texto={m} ativo={m === mercado} onPress={() => setMercado(m)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <Campo rotulo="Outro mercado" value={MERCADOS_PADRAO.includes(mercado) ? '' : mercado} onChangeText={setMercado} placeholder="Nome" />
        <View style={{ width: 100 }}>
          <Campo rotulo="Preço (R$)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" placeholder="9,99" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Botao tipo="secundario" titulo="Fechar" onPress={aoFechar} /></View>
        <View style={{ flex: 1 }}><Botao titulo="Anotar preço" onPress={salvar} desabilitado={!mercado.trim() || valor === null} /></View>
      </View>
      {aviso && <Text style={{ fontSize: 13, color: cores.verdeEscuro, lineHeight: 18 }}>{aviso}</Text>}
    </View>
  );
}
