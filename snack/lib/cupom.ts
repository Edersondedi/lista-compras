import { arred } from './logic';
import { SEM_NOME, redeNoTexto } from './nfce';
import { ItemNota } from './types';

/**
 * Leitura do texto de um cupom fiscal fotografado (texto vindo do OCR, com erros).
 * É uma leitura "melhor esforço": o resultado sempre passa por revisão na tela antes de salvar.
 */

export interface CupomLido {
  mercado: string;
  data?: string; // ISO
  itens: ItemNota[];
  total: number | null; // total impresso no cupom, se encontrado
  somaItens: number;
}

const UN = 'UN|UND|UNID|KG|PC|PCT|PCS|LT|L|CX|FD|BD|DZ|G|GR|ML|SC|BJ|FR|EMB|CJ|PT';
const DIN = String.raw`\d{1,5}\s?[.,]\s?\d{2}(?!\d)`;
const RE_QTD = new RegExp(String.raw`(\d{1,4}(?:[.,]\d{1,3})?)\s*(${UN})\b\.?\s*(?:[xX*×]\s*)?(${DIN})(?:\s+(?:R\$\s*)?(${DIN}))?`, 'i');
const RE_DIN_FINAL = new RegExp(String.raw`(?:R\$\s*)?(${DIN})\s*[A-Z]?\s*$`, 'i');
const PARAR = /VALOR\s+TOTAL|TOTAL\s+R\$|QTD\.?\s*TOTAL|QUANTIDADE\s+TOTAL|VALOR\s+A\s+PAGAR|FORMA\s+(DE\s+)?PAGAMENTO|SUB\s*-?\s*TOTAL/i;
const IGNORAR =
  /CNPJ|CPF|DOCUMENTO\s+AUXILIAR|NFC-?E|CONSUMIDOR|PROTOCOLO|CHAVE|TRIBUTOS|DESCONTO|ACR[EÉ]SCIMO|TROCO|CART[AÃ]O|DINHEIRO|\bPIX\b|D[EÉ]BITO|CR[EÉ]DITO|\bIE\b|INSCRI|ENDERE|FONE|DESCRI[CÇ][AÃ]O|VL\.?\s*UNIT|EMISS[AÃ]O|S[EÉ]RIE|CAIXA|OPERADOR|VOLTE SEMPRE|OBRIGAD/i;

export const numeroBr = (s: string) => Number(s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

/** Corrige trocas típicas do OCR dentro de números: O→0, I/l→1, S→5. */
function consertarNumeros(linha: string): string {
  return linha
    .split(/(\s+)/)
    .map((tok) => (/\d/.test(tok) && /^[\dOoIlS.,R$]+$/.test(tok) ? tok.replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5') : tok))
    .join('');
}

function limparDescricao(d: string): string {
  return d
    .replace(/^\s*\d{1,3}\s+(?=\S)/, '') // número do item
    .replace(/^\s*\d{6,14}\s+/, '') // código de barras / interno
    .replace(/\s+\d{6,14}\s*$/, '')
    .replace(/[|_~]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const letras = (s: string) => (s.match(/[A-Za-zÀ-ú]/g) ?? []).length;

function lerData(texto: string): string | undefined {
  const re = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/g;
  for (const m of texto.matchAll(re)) {
    const [d, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (a < 2020 || a > 2040 || mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    return new Date(a, mo - 1, d, m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0).toISOString();
  }
  return undefined;
}

function lerTotal(texto: string): number | null {
  const pref = texto.match(new RegExp(String.raw`VALOR\s+(?:TOTAL|A\s+PAGAR)[^\d\n]*(${DIN})`, 'i'));
  const qualquer = pref ?? texto.match(new RegExp(String.raw`\bTOTAL\b[^\d\n]*(${DIN})`, 'i'));
  return qualquer ? numeroBr(qualquer[1]) : null;
}

function lerMercado(linhas: string[], texto: string): string {
  const rede = redeNoTexto(texto);
  if (rede) return rede;
  const cab = linhas.slice(0, 5).find((l) => letras(l) >= 4 && !IGNORAR.test(l) && !/\d{5}/.test(l));
  return cab ? cab.trim() : SEM_NOME;
}

export function lerCupom(textoOcr: string): CupomLido {
  const linhas = textoOcr
    .split('\n')
    .map((l) => consertarNumeros(l).trim())
    .filter(Boolean);
  const itens: ItemNota[] = [];
  let pendente = '';
  let encerrado = false;

  for (const linha of linhas) {
    if (encerrado) break;
    if (PARAR.test(linha)) {
      encerrado = itens.length > 0;
      pendente = '';
      continue;
    }
    if (IGNORAR.test(linha)) {
      pendente = '';
      continue;
    }

    const q = linha.match(RE_QTD);
    if (q && q.index !== undefined) {
      const quantidade = numeroBr(q[1]);
      const valorUnitario = numeroBr(q[3]);
      const resto = linha.slice(q.index + q[0].length);
      const totalLinha = q[4] ? numeroBr(q[4]) : (resto.match(new RegExp(DIN)) ? numeroBr(resto.match(new RegExp(DIN))![0]) : arred(quantidade * valorUnitario));
      let descricao = limparDescricao(linha.slice(0, q.index));
      if (letras(descricao) < 3) descricao = pendente;
      pendente = '';
      if (!descricao || !(quantidade > 0) || !(valorUnitario > 0)) continue;
      itens.push({ descricao, quantidade, unidade: q[2].toUpperCase(), valorUnitario, valorTotal: totalLinha });
      continue;
    }

    const din = linha.match(RE_DIN_FINAL);
    if (din && din.index !== undefined) {
      const descricao = limparDescricao(linha.slice(0, din.index));
      if (letras(descricao) >= 3) {
        const v = numeroBr(din[1]);
        if (v > 0) itens.push({ descricao, quantidade: 1, unidade: 'UN', valorUnitario: v, valorTotal: v });
        pendente = '';
        continue;
      }
    }

    // Linha só com texto: pode ser a descrição de um item cujo preço vem na linha de baixo.
    pendente = letras(linha) >= 3 ? limparDescricao(linha) : '';
  }

  return {
    mercado: lerMercado(linhas, textoOcr),
    data: lerData(textoOcr),
    itens,
    total: lerTotal(textoOcr),
    somaItens: arred(itens.reduce((s, i) => s + i.valorTotal, 0)),
  };
}

// ---------- Etiqueta de preço ----------

export interface PalavraOcr {
  texto: string;
  altura: number; // altura da caixa da palavra, em pixels
}

/**
 * Preços candidatos numa foto de etiqueta, do maior (fonte maior = preço principal) para o menor.
 * Junta "12" + "99" quando os centavos aparecem separados (centavos pequenos ao lado, comum em etiquetas).
 */
export function precosDaEtiqueta(palavras: PalavraOcr[]): number[] {
  const cand: { valor: number; altura: number }[] = [];
  const ps = palavras.map((p) => ({ ...p, texto: consertarNumeros(p.texto.replace(/^[^\dOoIlS]+|[^\d]+$/g, '')) }));
  for (let i = 0; i < ps.length; i++) {
    const t = ps[i].texto;
    const m = t.match(/^(\d{1,4})[.,](\d{2})$/);
    if (m) {
      cand.push({ valor: numeroBr(`${m[1]},${m[2]}`), altura: ps[i].altura });
      continue;
    }
    const inteiro = t.match(/^(\d{1,4})[.,]?$/);
    const prox = ps[i + 1]?.texto.match(/^[.,]?(\d{2})$/);
    if (inteiro && prox) {
      cand.push({ valor: numeroBr(`${inteiro[1]},${prox[1]}`), altura: ps[i].altura });
      i++;
    }
  }
  // O mesmo valor lido em várias escalas ganha peso (um dígito lido errado numa escala perde para o lido certo nas outras).
  const porValor = new Map<number, { altura: number; votos: number }>();
  for (const c of cand) {
    if (!(c.valor > 0 && c.valor < 10000)) continue;
    const v = porValor.get(c.valor) ?? { altura: 0, votos: 0 };
    v.altura = Math.max(v.altura, c.altura);
    v.votos += 1;
    porValor.set(c.valor, v);
  }
  return [...porValor.entries()]
    .map(([valor, v]) => ({ valor, peso: v.altura * (1 + 0.5 * (v.votos - 1)) }))
    .sort((a, b) => b.peso - a.peso)
    .map((c) => c.valor)
    .slice(0, 5);
}
