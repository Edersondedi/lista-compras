import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { casa, mercadosConhecidos, numeroOuNulo, reais } from '../lib/logic';
import { useLoja } from '../store';
import { Aviso, Botao, Campo, Cartao, Chip, Secao, cores, s } from '../ui';

export default function TelaPromocoes() {
  const { lista, notas, ofertas, clubes, alternarClube, salvarOferta, removerOferta } = useLoja();
  const mercados = [...new Set([...mercadosConhecidos(notas, ofertas), ...clubes])];

  const [novoMercado, setNovoMercado] = useState('');
  const [item, setItem] = useState('');
  const [mercado, setMercado] = useState('');
  const [de, setDe] = useState('');
  const [por, setPor] = useState('');
  const [validade, setValidade] = useState(''); // dd/mm
  const [clube, setClube] = useState(false);

  const precoPor = numeroOuNulo(por);
  const podeSalvar = !!item.trim() && !!mercado.trim() && precoPor !== null;

  function salvar() {
    if (!podeSalvar || precoPor === null) return;
    const precoDe = numeroOuNulo(de);
    salvarOferta({
      item: item.trim(),
      mercado: mercado.trim(),
      precoOferta: precoPor,
      ...(precoDe !== null ? { precoNormal: precoDe } : {}),
      tipo: clube ? 'clube' : 'todos',
      ...(validadeIso(validade) ? { validade: validadeIso(validade)! } : {}),
    });
    setItem('');
    setDe('');
    setPor('');
    setValidade('');
  }

  const naLista = (nome: string) => lista.some((i) => !i.comprado && casa(i.nome, nome));
  const ordenadas = [...ofertas].sort((a, b) => Number(naLista(b.item)) - Number(naLista(a.item)));

  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={s.titulo}>Promoções e clubes</Text>
        <Text style={s.subtitulo}>Ofertas de itens da sua lista aparecem primeiro</Text>

        <Secao titulo="Onde você é cadastrado (clube ou cooperado)">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {mercados.map((m) => (
              <Chip key={m} texto={clubes.includes(m) ? `${m} · cadastrado` : `+ ${m}`} ativo={clubes.includes(m)} onPress={() => alternarClube(m)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <Campo rotulo="Outro mercado" value={novoMercado} onChangeText={setNovoMercado} placeholder="Nome do mercado" />
            <View style={{ width: 110 }}>
              <Botao
                tipo="secundario"
                titulo="Adicionar"
                desabilitado={!novoMercado.trim()}
                onPress={() => {
                  alternarClube(novoMercado.trim());
                  setNovoMercado('');
                }}
              />
            </View>
          </View>
        </Secao>

        <Secao titulo="Cadastrar oferta (encarte, app ou gôndola)">
          <Cartao style={{ padding: 14, gap: 10 }}>
            <Campo rotulo="Produto" value={item} onChangeText={setItem} placeholder="Ex.: café 500 g" />
            <Campo rotulo="Mercado" value={mercado} onChangeText={setMercado} placeholder="Nome do mercado" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {mercados.map((m) => (
                <Chip key={m} texto={m} ativo={m === mercado} onPress={() => setMercado(m)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Campo rotulo="De (R$)" value={de} onChangeText={setDe} keyboardType="decimal-pad" placeholder="21,90" />
              <Campo rotulo="Por (R$)" value={por} onChangeText={setPor} keyboardType="decimal-pad" placeholder="17,49" />
              <Campo rotulo="Válida até" value={validade} onChangeText={setValidade} placeholder="dd/mm" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip texto="Para todos" ativo={!clube} onPress={() => setClube(false)} />
              <Chip texto="Só clube/cooperado" ativo={clube} onPress={() => setClube(true)} />
            </View>
            <Botao titulo="Salvar oferta" onPress={salvar} desabilitado={!podeSalvar} />
          </Cartao>
        </Secao>

        {ofertas.length === 0 ? (
          <Aviso tipo="info">Nenhuma oferta cadastrada. Por enquanto as ofertas entram à mão; a integração com as redes depende de parceria.</Aviso>
        ) : (
          <Secao titulo="Ofertas">
            <Cartao>
              {ordenadas.map((o) => (
                <View key={o.id} style={s.linha}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.textoItem}>{o.item}</Text>
                    <Text style={s.detalhe}>
                      {o.mercado}
                      {o.validade ? ` · até ${o.validade.slice(8, 10)}/${o.validade.slice(5, 7)}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      <Etiqueta texto={o.fonte === 'menorpreco' ? 'Menor Preço' : o.tipo === 'clube' ? 'Preço de clube' : 'Para todos'} clube={o.tipo === 'clube'} />
                      {naLista(o.item) && <Etiqueta texto="Na sua lista" destaque />}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {o.precoNormal !== undefined && (
                      <Text style={[s.detalhe, { textDecorationLine: 'line-through' }]}>{reais(o.precoNormal)}</Text>
                    )}
                    <Text style={{ fontSize: 17, fontWeight: '700', color: cores.verde }}>{reais(o.precoOferta)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Excluir oferta ${o.item}`} onPress={() => removerOferta(o.id)} style={{ minHeight: 32, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, color: cores.perigo }}>Excluir</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Cartao>
          </Secao>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Etiqueta({ texto, clube, destaque }: { texto: string; clube?: boolean; destaque?: boolean }) {
  const bg = destaque ? cores.alerta : clube ? cores.azulClaro : '#EEF1EF';
  const fg = destaque ? cores.alertaTexto : clube ? cores.azulTexto : '#3D4842';
  return (
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: fg }}>{texto}</Text>
    </View>
  );
}

/** "dd/mm" → "aaaa-mm-dd" no ano corrente (ou no próximo, se a data já passou há mais de 6 meses). */
function validadeIso(texto: string): string | null {
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const hoje = new Date();
  let ano = hoje.getFullYear();
  const d = new Date(ano, Number(m[2]) - 1, Number(m[1]));
  if (hoje.getTime() - d.getTime() > 180 * 86_400_000) ano++;
  return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
