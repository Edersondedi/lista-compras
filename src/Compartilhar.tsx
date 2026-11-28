import { useEffect, useState } from 'react';
import { Linking, Platform, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ItemCompartilhado, lerLista, separarNovos, textoParaEnviar } from './lib/compartilhar';
import { qtdItens } from './lib/logic';
import { ImportarNotas } from './ImportarNotas';
import { useLoja } from './store';
import { Aviso, Botao, Cartao, cores, s } from './ui';

/** Lê ?lista=... do endereço (quando a pessoa abre o link recebido no WhatsApp). */
const CHAVE_ULTIMA = 'compra-certa-ultima-lista';

function listaDoEndereco(): ItemCompartilhado[] | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const busca = window.location.search;
  try {
    if (busca && localStorage.getItem(CHAVE_ULTIMA) === busca) return null; // já tratada antes
  } catch {}
  return lerLista(busca);
}

/** Marca o link como tratado e tira ?lista= do endereço, para não perguntar de novo ao recarregar. */
function limparEndereco() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.search.includes('lista=')) return;
  try {
    localStorage.setItem(CHAVE_ULTIMA, window.location.search);
  } catch {}
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
}

export function Compartilhar() {
  const { lista, pronto, receberItens } = useLoja();
  const [aberto, setAberto] = useState<'enviar' | 'receber' | 'notas' | null>(null);
  const [recebidos, setRecebidos] = useState<ItemCompartilhado[] | null>(null);
  const [colado, setColado] = useState('');
  const [aviso, setAviso] = useState('');
  const pendentes = lista.filter((i) => !i.comprado);

  useEffect(() => {
    if (!pronto) return;
    const r = listaDoEndereco();
    if (r) setRecebidos(r);
  }, [pronto]);

  async function enviar() {
    const texto = textoParaEnviar(lista);
    setAviso('');
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : null;
      if (nav?.share) {
        try {
          await nav.share({ text: texto });
          return;
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
        }
      }
      await Clipboard.setStringAsync(texto);
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(texto)}`);
      setAviso('A lista também foi copiada. Se o WhatsApp não abrir, cole na conversa.');
      return;
    }
    await Share.share({ message: texto });
  }

  async function colarDaAreaDeTransferencia() {
    const t = await Clipboard.getStringAsync();
    setColado(t);
    lerColado(t);
  }

  function lerColado(t = colado) {
    const r = lerLista(t);
    if (r) {
      setRecebidos(r);
      setAviso('');
    } else setAviso('Não encontrei uma lista nesse texto. Cole a mensagem inteira (ou o link) que recebeu.');
  }

  const sep = recebidos ? separarNovos(recebidos, lista) : null;

  function juntar() {
    if (!sep) return;
    receberItens(sep.novos);
    setAviso(`${qtdItens(sep.novos.length)} adicionado${sep.novos.length === 1 ? '' : 's'} à sua lista.`);
    setRecebidos(null);
    setColado('');
    setAberto(null);
    limparEndereco();
  }

  if (sep) {
    return (
      <Cartao style={{ padding: 14, gap: 10, marginTop: 16, borderColor: cores.verde, borderWidth: 1.5 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>Lista recebida ({qtdItens(recebidos!.length)})</Text>
        {sep.novos.length > 0 ? (
          <Text style={s.detalhe}>Novos: {sep.novos.map((i) => i.nome + (i.quantidade ? ` (${i.quantidade})` : '')).join(', ')}</Text>
        ) : (
          <Text style={s.detalhe}>Todos os itens já estão na sua lista.</Text>
        )}
        {sep.repetidos.length > 0 && (
          <Text style={s.detalhe}>Já na sua lista (não serão repetidos): {sep.repetidos.map((i) => i.nome).join(', ')}</Text>
        )}
        {sep.novos.length > 0 && <Botao titulo={`Juntar à minha lista (${qtdItens(sep.novos.length)})`} onPress={juntar} />}
        <Botao tipo="secundario" titulo="Descartar" onPress={() => {
            setRecebidos(null);
            limparEndereco();
          }}
        />
      </Cartao>
    );
  }

  return (
    <View style={{ gap: 10, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Botao
            tipo="secundario"
            titulo="Enviar lista"
            onPress={() => (aberto === 'enviar' ? setAberto(null) : setAberto('enviar'))}
            desabilitado={pendentes.length === 0}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Botao tipo="secundario" titulo="Receber lista" onPress={() => setAberto(aberto === 'receber' ? null : 'receber')} />
        </View>
      </View>
      <Botao tipo="secundario" titulo="Importar do app Notas" onPress={() => setAberto(aberto === 'notas' ? null : 'notas')} />
      {aberto === 'notas' && <ImportarNotas aoFechar={() => setAberto(null)} />}

      {aberto === 'enviar' && (
        <Cartao style={{ padding: 14, gap: 10 }}>
          <Text style={s.detalhe}>
            Envia os {qtdItens(pendentes.length)} que faltam comprar, com um link. Quem receber toca no link e junta à lista
            dela. As listas não se atualizam sozinhas: a cada mudança, envie de novo.
          </Text>
          <Botao titulo="Enviar pelo WhatsApp" onPress={enviar} />
        </Cartao>
      )}

      {aberto === 'receber' && (
        <Cartao style={{ padding: 14, gap: 10 }}>
          <Text style={s.detalhe}>
            O mais fácil: toque no link que chegou no WhatsApp. Se abrir em outro lugar, copie a mensagem inteira e cole aqui.
          </Text>
          <Botao titulo="Colar mensagem copiada" onPress={colarDaAreaDeTransferencia} />
          <TextInput
            accessibilityLabel="Mensagem ou link da lista"
            value={colado}
            onChangeText={setColado}
            placeholder="Ou cole aqui o link / mensagem"
            multiline
            style={[s.campo, { minHeight: 60 }]}
          />
          <Botao tipo="secundario" titulo="Ler lista" onPress={() => lerColado()} desabilitado={!colado.trim()} />
        </Cartao>
      )}

      {!!aviso && <Aviso tipo="info">{aviso}</Aviso>}
    </View>
  );
}
