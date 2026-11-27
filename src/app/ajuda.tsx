import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cartao, cores, s } from '../ui';

type Topico = { icone: keyof typeof Ionicons.glyphMap; titulo: string; passos: string[] };

const TOPICOS: Topico[] = [
  {
    icone: 'phone-portrait-outline',
    titulo: 'Primeiros passos',
    passos: [
      'Abra o app no Safari e toque em Compartilhar → "Adicionar à Tela de Início". Ele vira um ícone como qualquer app.',
      'Na aba Lista, em "Lista da casa", toque em "Criar lista" e depois em "Convidar" para mandar o link pelo WhatsApp.',
      'Quem recebe toca no link e entra. A partir daí, lista, notas, preços, clubes e meta de gastos ficam iguais nos dois celulares.',
    ],
  },
  {
    icone: 'list',
    titulo: 'Lista',
    passos: [
      'Digite o item, a quantidade (opcional), escolha a categoria e toque em "Adicionar à lista".',
      'Toque no item para marcar como comprado; segure para apagar.',
      '"Vocês sempre compram" mostra atalhos dos itens que já entraram na lista mais de uma vez.',
      '"Preço" abre o histórico de preço do item, atalhos para o site de cada mercado e um campo para anotar o preço que você viu.',
    ],
  },
  {
    icone: 'cart-outline',
    titulo: 'Mercado (na hora da compra)',
    passos: [
      'Escolha em qual mercado você está. A lista aparece na ordem dos corredores.',
      'Digite o preço de cada item ou toque na câmera para ler o preço pela foto da etiqueta. O item é marcado como pego.',
      'O total do carrinho fica fixo embaixo. Se o preço estiver acima da média que vocês costumam pagar, o app avisa.',
      'No fim, "Finalizar e salvar" lança a compra em Gastos. Se for ler o cupom depois, use "Finalizar sem salvar" para não contar duas vezes.',
    ],
  },
  {
    icone: 'swap-horizontal',
    titulo: 'Comparar',
    passos: [
      'Mostra em qual mercado a lista sai mais barata e o menor preço de cada item, usando os preços que vocês registraram (notas, preços anotados e sites).',
      '"Pesquisar preços da lista" guia item por item: abre o site do mercado e você anota o preço.',
      'No fim da tela, marque os mercados em que vocês têm cadastro no clube ou são cooperados.',
    ],
  },
  {
    icone: 'pricetag',
    titulo: 'Promoções',
    passos: ['Atalhos para os encartes da semana de cada mercado. Viu uma oferta boa? Anote o preço no item, pela aba Lista.'],
  },
  {
    icone: 'bar-chart',
    titulo: 'Gastos',
    passos: [
      'Total do mês, gráfico dos últimos 6 meses (toque numa barra para ver o mês), gasto por mercado, por categoria e os itens que mais pesaram.',
      'Defina uma meta mensal: o app avisa ao passar de 80% e quando estoura.',
      'Tudo sai das compras registradas na aba Nota fiscal ou finalizadas na aba Mercado.',
    ],
  },
  {
    icone: 'receipt',
    titulo: 'Nota fiscal',
    passos: [
      '"Ler cupom pela foto": fotografe o cupom esticado, bem iluminado e enchendo a tela. Confira os produtos, o mercado e a data antes de salvar.',
      'Cupom comprido: fotografe em partes e salve cada parte.',
      'Também dá para copiar a página da nota no Safari (pelo QR Code) e colar no app, ou digitar a compra.',
      'No histórico, toque numa compra para ver todos os produtos. Ali mesmo dá para corrigir o mercado e a data ou excluir a compra.',
    ],
  },
  {
    icone: 'bulb-outline',
    titulo: 'Dicas e limites',
    passos: [
      'Quanto mais cupons vocês registrarem, melhores ficam a comparação, o histórico de preço e os gastos.',
      'A leitura por foto acontece no próprio celular (a foto não é enviada para lugar nenhum). Na primeira vez ela baixa o leitor, cerca de 5 MB.',
      'O app não busca preços sozinho nos sites dos mercados: os preços vêm do que vocês registram.',
      'Se aparecer "Sem conexão" na Lista da casa, recarregue a página.',
    ],
  },
];

export default function TelaAjuda() {
  const [aberto, setAberto] = useState<string | null>('Primeiros passos');
  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Text style={s.titulo}>Como usar</Text>
        <Text style={s.subtitulo}>Toque num tema para ver o passo a passo</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {TOPICOS.map((t) => {
            const ativo = aberto === t.titulo;
            return (
              <Cartao key={t.titulo}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: ativo }}
                  onPress={() => setAberto(ativo ? null : t.titulo)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 52 }}
                >
                  <Ionicons name={t.icone} size={22} color={cores.verde} />
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: cores.texto }}>{t.titulo}</Text>
                  <Ionicons name={ativo ? 'chevron-up' : 'chevron-down'} size={18} color={cores.secundario} />
                </Pressable>
                {ativo && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                    {t.passos.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: cores.verde, fontWeight: '700', width: 18 }}>{i + 1}.</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: cores.texto, lineHeight: 20 }}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Cartao>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
