import { describe, expect, it } from '@jest/globals';
import { extrairChave, lerPaginaNfce, lerTextoNfce, nomeDoMercado, pareceQrNfce, SEM_NOME } from '../src/lib/nfce';

// Página sintética no layout "padrão" dos portais de consulta da NFC-e.
// Precisa ser substituída por uma página real de SC para validar o parser.
const html = `
<html><body>
<div id="conteudo">
  <div id="u20" class="txtTopo">MERCADO EXEMPLO LTDA</div>
  <table id="tabResult">
    <tr id="Item + 1">
      <td><span class="txtTit">CAFE TORRADO MOIDO 500G</span>
      <span class="RCod">(Código: 7891234567895 )</span><br>
      <span class="Rqtd"><strong>Qtde.:</strong>2</span>
      <span class="RUN"><strong>UN: </strong>UN</span>
      <span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;21,90</span></td>
      <td class="txtTit noWrap">Vl. Total<br><span class="valor">43,80</span></td>
    </tr>
    <tr id="Item + 2">
      <td><span class="txtTit">BANANA PRATA KG</span>
      <span class="Rqtd"><strong>Qtde.:</strong>1,235</span>
      <span class="RUN"><strong>UN: </strong>KG</span>
      <span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;6,49</span></td>
      <td><span class="valor">8,02</span></td>
    </tr>
  </table>
  <div id="linhaTotal"><label>Valor a pagar R$:</label><span class="totalNumb txtMax">51,82</span></div>
  <li><strong>Emissão: </strong>22/11/2026 14:33:10 - Via Consumidor</li>
</div></body></html>`;

describe('NFC-e', () => {
  const url = 'https://sat.sef.sc.gov.br/nfce/consulta?p=42261112345678000190650010000123451000123456|2|1|1|ABCDEF';

  it('reconhece o QR e extrai a chave de 44 dígitos', () => {
    expect(pareceQrNfce(url)).toBe(true);
    expect(extrairChave(url)).toBe('42261112345678000190650010000123451000123456');
    expect(pareceQrNfce('7891234567895')).toBe(false);
  });

  it('lê loja, data, itens e total', () => {
    const n = lerPaginaNfce(html)!;
    expect(n.mercado).toBe('MERCADO EXEMPLO LTDA');
    expect(n.data).toBe('2026-11-22T14:33:10');
    expect(n.total).toBe(51.82);
    expect(n.itens).toEqual([
      { descricao: 'CAFE TORRADO MOIDO 500G', quantidade: 2, unidade: 'UN', valorUnitario: 21.9, valorTotal: 43.8, codigo: '7891234567895' },
      { descricao: 'BANANA PRATA KG', quantidade: 1.235, unidade: 'KG', valorUnitario: 6.49, valorTotal: 8.02 },
    ]);
  });

  it('devolve null para layout desconhecido', () => {
    expect(lerPaginaNfce('<html><p>outro layout</p></html>')).toBeNull();
  });

  it('lê o texto copiado da página (formato do portal de SC, dados fictícios)', () => {
    const texto = [
      'DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA',
      '',
      'MERCADO EXEMPLO LJ 1 - BLUMENAU',
      'CNPJ: 00.000.000/0001-00',
      'RUA EXEMPLO , 100 , , CENTRO , BLUMENAU , SC',
      'LIMAO TAITI kg (Código: 8386 )',
      'Qtde.:0,615UN: KG1Vl. Unit.:   14,99\tVl. Total',
      '9,22',
      'CAFE TORRADO 500G (Código: 7891234567895 )',
      'Qtde.:2UN: UN1Vl. Unit.:   21,9\tVl. Total',
      '43,80',
      'Qtd. total de itens:', '2', 'Valor total R$:', '53,02', 'Descontos R$:', '1,00', 'Valor a pagar R$:', '52,02',
      'Emissão: 07/11/2026 08:58:31 - Via Consumidor 2',
    ].join('\n');
    const n = lerTextoNfce(texto)!;
    expect(n.mercado).toBe('MERCADO EXEMPLO LJ 1 - BLUMENAU');
    expect(n.data).toBe('2026-11-07T08:58:31');
    expect(n.total).toBe(52.02);
    expect(n.itens).toEqual([
      { descricao: 'LIMAO TAITI kg', quantidade: 0.615, unidade: 'KG', valorUnitario: 14.99, valorTotal: 9.22 },
      { descricao: 'CAFE TORRADO 500G', quantidade: 2, unidade: 'UN', valorUnitario: 21.9, valorTotal: 43.8, codigo: '7891234567895' },
    ]);
  });

  const item = 'ARROZ T1 5KG (Código: 123 )\nQtde.:1UN: UN1Vl. Unit.:   26,9\tVl. Total\n26,90';

  it('acha o nome pela linha antes do CNPJ e converte para o nome da rede', () => {
    const n = lerTextoNfce(`KOCH HIPERMERCADO S/A LJ 89 - BLUMENAU\nCNPJ: 02.000.000/0001-00\nRUA X , SC\n${item}`)!;
    expect(n.mercado).toBe('Koch');
  });

  it('sem cabeçalho, marca como nome não lido', () => {
    expect(lerTextoNfce(item)!.mercado).toBe(SEM_NOME);
  });

  it('nomes das redes', () => {
    expect(nomeDoMercado('KOMPRAO KOCH ATACADISTA LTDA')).toBe('Komprão');
    expect(nomeDoMercado('COOPERATIVA DE CONSUMO')).toBe('Cooper');
    expect(nomeDoMercado('MERCADO DO BAIRRO')).toBe('MERCADO DO BAIRRO');
  });
});
