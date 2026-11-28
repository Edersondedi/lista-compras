import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { lerCodigo, mostrarCodigo } from './lib/codigoLista';
import { URL_APP } from './lib/compartilhar';
import { confirmar } from './confirmar';
import { useLoja } from './store';
import { criarListaCompartilhada, entrarNaLista, iniciarSync, sairDaLista, syncDisponivel } from './sync';
import { Aviso, Botao, Cartao, cores, s } from './ui';

/** ?codigo=XXXX no endereço (link de convite aberto no navegador). */
function codigoDoEndereco(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.location.search.includes('codigo=') ? lerCodigo(window.location.search) : null;
}

function limparEndereco() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
}

const textoConvite = (codigo: string) =>
  `Vamos usar a mesma lista de compras no Compra Certa. Toque no link para entrar:\n${URL_APP}?codigo=${codigo}\n\nOu, no app, toque em "Entrar com código" e digite: ${mostrarCodigo(codigo)}`;

async function compartilhar(texto: string) {
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
    return;
  }
  await Share.share({ message: texto });
}

export function ListaDaCasa() {
  const { pronto, codigoLista, statusSync } = useLoja();
  const [modo, setModo] = useState<'fechado' | 'entrar'>('fechado');
  const [digitado, setDigitado] = useState('');
  const [convite, setConvite] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!pronto || !syncDisponivel) return;
    iniciarSync();
    const c = codigoDoEndereco();
    if (!c) return;
    const s = useLoja.getState();
    if (c === s.codigoLista) limparEndereco();
    else if (!s.codigoLista && !s.lista.length && !s.notas.length && !s.ofertas.length) entrar(c); // nada a juntar: entra direto
    else setConvite(c);
  }, [pronto]);

  if (!syncDisponivel) return null;

  async function executar(acao: () => Promise<string>) {
    setOcupado(true);
    setMsg('');
    try {
      setMsg(await acao());
    } catch (e) {
      const t = (e as Error)?.message ?? '';
      setMsg(/offline|network|unavailable/i.test(t) ? 'Sem internet agora. Tente de novo em instantes.' : t || 'Não deu certo. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  const entrar = (codigo: string) =>
    executar(async () => {
      const n = await entrarNaLista(codigo);
      setConvite(null);
      setModo('fechado');
      setDigitado('');
      limparEndereco();
      return n > 0 ? `Pronto! ${n === 1 ? '1 item seu foi levado' : `${n} itens seus foram levados`} para a lista da casa.` : 'Pronto! Você está na lista da casa.';
    });

  // Convite recebido por link
  if (convite) {
    return (
      <Cartao style={{ padding: 14, gap: 10, marginTop: 16, borderColor: cores.verde, borderWidth: 1.5 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>Entrar na lista da casa {mostrarCodigo(convite)}?</Text>
        <Text style={s.detalhe}>
          A sua lista, as notas fiscais e os preços anotados passam a ser os mesmos da pessoa que te convidou e atualizam sozinhos nos dois celulares. Os itens que você
          ainda não comprou e ela não tem são levados junto.
          {codigoLista ? ' Você vai sair da lista compartilhada atual.' : ''}
        </Text>
        {ocupado ? <ActivityIndicator color={cores.verde} /> : <Botao titulo="Entrar na lista" onPress={() => entrar(convite)} />}
        <Botao
          tipo="secundario"
          titulo="Agora não"
          onPress={() => {
            setConvite(null);
            limparEndereco();
          }}
        />
        {!!msg && <Aviso>{msg}</Aviso>}
      </Cartao>
    );
  }

  // Já conectado
  if (codigoLista) {
    const status =
      statusSync === 'ok' ? 'Atualizada' : statusSync === 'conectando' ? 'Conectando…' : 'Sem conexão — as mudanças sobem quando a internet voltar';
    return (
      <Cartao style={{ padding: 14, gap: 8, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: cores.texto }}>Lista da casa</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: 2, color: cores.verde }} selectable>
            {mostrarCodigo(codigoLista)}
          </Text>
        </View>
        <Text style={[s.detalhe, { color: statusSync === 'erro' ? cores.alertaTexto : cores.secundario }]}>{status}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Botao tipo="secundario" titulo="Convidar" onPress={() => compartilhar(textoConvite(codigoLista))} />
          </View>
          <View style={{ flex: 1 }}>
            <Botao
              tipo="secundario"
              titulo="Sair"
              onPress={() =>
                confirmar(
                  'Sair da lista da casa',
                  'Este celular para de receber as mudanças. A lista atual fica salva aqui. Para voltar, use o código.',
                  'Sair',
                  sairDaLista,
                )
              }
            />
          </View>
        </View>
        {!!msg && <Aviso tipo="info">{msg}</Aviso>}
      </Cartao>
    );
  }

  // Ainda não conectado
  return (
    <Cartao style={{ padding: 14, gap: 10, marginTop: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: cores.texto }}>Lista da casa</Text>
      <Text style={s.detalhe}>Use a mesma lista, notas fiscais e preços anotados em mais de um celular. Atualiza sozinha, sem cadastro: basta um código.</Text>
      {ocupado ? (
        <ActivityIndicator color={cores.verde} />
      ) : modo === 'entrar' ? (
        <>
          <TextInput
            accessibilityLabel="Código da lista"
            value={digitado}
            onChangeText={setDigitado}
            placeholder="Ex.: K7P2-X9AB"
            autoCapitalize="characters"
            autoCorrect={false}
            style={[s.campo, { fontSize: 18, letterSpacing: 2 }]}
          />
          <Botao
            titulo="Entrar"
            desabilitado={!lerCodigo(digitado)}
            onPress={() => {
              const c = lerCodigo(digitado);
              if (c) entrar(c);
            }}
          />
          <Botao tipo="secundario" titulo="Voltar" onPress={() => setModo('fechado')} />
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Botao
              titulo="Criar lista"
              onPress={() =>
                executar(async () => {
                  const c = await criarListaCompartilhada();
                  return `Lista criada! Código ${mostrarCodigo(c)}. Toque em "Convidar" para mandar pelo WhatsApp.`;
                })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Botao tipo="secundario" titulo="Entrar com código" onPress={() => setModo('entrar')} />
          </View>
        </View>
      )}
      {!!msg && <Aviso>{msg}</Aviso>}
    </Cartao>
  );
}

/** "#casa=K7P2X9AB" no endereço. */
function codigoDoHash(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const m = window.location.hash.match(/casa=([0-9A-Za-z-]+)/);
  return m ? lerCodigo(m[1]) : null;
}

/**
 * Guarda o código da lista da casa no próprio endereço (#casa=...). No iPhone, o ícone da Tela de Início,
 * o navegador de dentro do WhatsApp e o Safari guardam dados separados; com o código no endereço,
 * qualquer um deles volta para a lista da casa sozinho. Usado no layout, vale para todas as abas.
 */
export function useCodigoNoEndereco(caminho: string) {
  const { pronto, codigoLista } = useLoja();

  // Ao abrir: liga a sincronização e, se o endereço tem o código e este aparelho não, entra sozinho.
  useEffect(() => {
    if (!pronto || !syncDisponivel) return;
    iniciarSync();
    const c = codigoDoHash();
    if (c && !useLoja.getState().codigoLista) entrarNaLista(c).catch(() => {});
  }, [pronto]);

  // Mantém o código no endereço em todas as abas (e tira ao sair da lista).
  useEffect(() => {
    if (!pronto || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const atual = codigoDoHash();
    if (codigoLista && atual !== codigoLista) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#casa=${codigoLista}`);
    } else if (!codigoLista && window.location.hash.includes('casa=')) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }
  }, [pronto, codigoLista, caminho]);
}
