import { describe, expect, it } from '@jest/globals';
import { extrairChave, lerPaginaNfce, pareceQrNfce } from '../src/lib/nfce';

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
});
