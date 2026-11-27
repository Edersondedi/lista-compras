import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CupomLido } from './lib/cupom';
import { arred, dataBr, lerDataBr, numeroOuNulo, reais } from './lib/logic';
import { NOMES_MERCADOS } from './lib/mercados';
import { SEM_NOME } from './lib/nfce';
import { ItemNota } from './lib/types';
import { Aviso, Botao, Campo, Cartao, Chip, cores, s } from './ui';

type Linha = { descricao: string; quantidade: number; unidade: string; total: string };

const paraLinha = (i: ItemNota): Linha => ({
  descricao: i.descricao,
  quantidade: i.quantidade,
  unidade: i.unidade,
  total: i.valorTotal.toFixed(2).replace('.', ','),
});

/** Conferência do cupom lido pela foto: tudo editável antes de salvar. */
export function RevisarCupom({
  cupom,
  aoSalvar,
  aoCancelar,
}: {
  cupom: CupomLido;
  aoSalvar: (n: { mercado: string; data: string; itens: ItemNota[]; total: number }) => void;
  aoCancelar: () => void;
}) {
  const [mercado, setMercado] = useState(cupom.mercado === SEM_NOME ? '' : cupom.mercado);
  const [data, setData] = useState(cupom.data ? dataBr(cupom.data) : dataBr(new Date().toISOString()));
  const [linhas, setLinhas] = useState<Linha[]>(cupom.itens.map(paraLinha));

  const validas = linhas
    .map((l) => ({ ...l, v: numeroOuNulo(l.total) }))
    .filter((l) => l.descricao.trim() && l.v !== null && l.v > 0);
  const soma = arred(validas.reduce((t, l) => t + (l.v ?? 0), 0));
  const dataIso = lerDataBr(data);
  const diferenca = cupom.total !== null ? arred(cupom.total - soma) : null;

  const mudar = (i: number, campo: 'descricao' | 'total', v: string) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  function salvar() {
    if (!dataIso) return;
    const itens: ItemNota[] = validas.map((l) => ({
      descricao: l.descricao.trim(),
      quantidade: l.quantidade || 1,
      unidade: l.unidade || 'UN',
      valorUnitario: arred((l.v as number) / (l.quantidade || 1)),
      valorTotal: l.v as number,
    }));
    aoSalvar({ mercado: mercado.trim(), data: dataIso, itens, total: soma });
  }

  return (
    <Cartao style={{ padding: 14, gap: 10, marginTop: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>Confira o que foi lido</Text>
      <Text style={s.detalhe}>A leitura por foto pode errar. Corrija nomes e valores, e apague o que não for produto.</Text>

      <Campo rotulo="Mercado" value={mercado} onChangeText={setMercado} placeholder="Nome do mercado" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {NOMES_MERCADOS.map((m) => (
          <Chip key={m} texto={m} ativo={m === mercado} onPress={() => setMercado(m)} />
        ))}
      </View>
      <Campo rotulo="Data da compra (dd/mm/aaaa)" value={data} onChangeText={setData} placeholder="27/11/2026" keyboardType="numbers-and-punctuation" />
      {!dataIso && <Text style={{ fontSize: 12, color: cores.perigo }}>Data inválida. Use o formato 27/11/2026.</Text>}

      <Text style={[s.detalhe, { marginTop: 4 }]}>
        {validas.length} produto{validas.length === 1 ? '' : 's'} · total do produto à direita
      </Text>
      {linhas.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TextInput
            accessibilityLabel={`Produto ${i + 1}`}
            value={l.descricao}
            onChangeText={(v) => mudar(i, 'descricao', v)}
            style={[s.campo, { flex: 1, fontSize: 13 }]}
          />
          <TextInput
            accessibilityLabel={`Valor do produto ${i + 1}`}
            value={l.total}
            onChangeText={(v) => mudar(i, 'total', v)}
            keyboardType="decimal-pad"
            style={[s.campo, { width: 78, textAlign: 'right', fontSize: 13 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apagar produto ${i + 1}`}
            onPress={() => setLinhas(linhas.filter((_, j) => j !== i))}
            style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: cores.perigo }}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setLinhas([...linhas, { descricao: '', quantidade: 1, unidade: 'UN', total: '' }])}
        style={{ minHeight: 40, justifyContent: 'center' }}
      >
        <Text style={{ color: cores.verde, fontWeight: '600' }}>+ Adicionar produto que faltou</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, color: cores.texto }}>Soma dos produtos</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: cores.texto }}>{reais(soma)}</Text>
      </View>
      {cupom.total !== null && (
        <Text style={s.detalhe}>Total impresso no cupom (lido): {reais(cupom.total)}</Text>
      )}
      {diferenca !== null && Math.abs(diferenca) > 0.05 && (
        <Aviso>
          A soma está {diferenca > 0 ? `${reais(diferenca)} abaixo` : `${reais(-diferenca)} acima`} do total do cupom. Pode faltar produto, ter valor
          lido errado ou ter desconto. Confira antes de salvar.
        </Aviso>
      )}
      {cupom.itens.length === 0 && (
        <Aviso>
          Não consegui ler produtos nesta foto. Tente outra foto com o cupom esticado, bem iluminado e enchendo a tela, ou digite os produtos aqui.
        </Aviso>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Botao tipo="secundario" titulo="Cancelar" onPress={aoCancelar} />
        </View>
        <View style={{ flex: 1 }}>
          <Botao titulo="Salvar compra" onPress={salvar} desabilitado={!mercado.trim() || !dataIso || validas.length === 0} />
        </View>
      </View>
    </Cartao>
  );
}
