import { ItemNota } from './types';

/**
 * Leitura da página de consulta pública da NFC-e (a URL que vem no QR Code do cupom).
 *
 * HIPÓTESE A VALIDAR COM NOTA REAL DE SC: o parser segue o layout "padrão" usado por
 * vários portais estaduais (tabela #tabResult com spans .txtTit, .Rqtd, .RUN,
 * .RvlUnit e .valor; nome da loja em #u20). Se o portal de SC usar outro layout,
 * `lerPaginaNfce` devolve null e o app oferece a digitação manual.
 */

/** Redes conhecidas: o nome da razão social vira o nome curto do mercado. */
const REDES: [RegExp, string][] = [
  [/\bCOOPER\b|COOPERATIVA/i, 'Cooper'],
  [/KOMPR[ÃA]O/i, 'Komprão'],
  [/\bKOCH\b/i, 'Koch'],
  [/\bFORT\b|GRUPO PEREIRA|COMERCIAL PEREIRA/i, 'Fort'],
  [/\bUNIDOS\b/i, 'Unidos'],
  [/ANGELONI/i, 'Angeloni'],
  [/GIASSI/i, 'Giassi'],
  [/BISTEK/i, 'Bistek'],
  [/ATACAD[ÃA]O/i, 'Atacadão'],
];

export function nomeDoMercado(razaoSocial: string): string {
  for (const [re, nome] of REDES) if (re.test(razaoSocial)) return nome;
  return razaoSocial.trim();
}

/** Procura uma rede conhecida em qualquer parte do texto (ex.: cupom lido por foto). */
export function redeNoTexto(texto: string): string | null {
  for (const [re, nome] of REDES) if (re.test(texto)) return nome;
  return null;
}

export const SEM_NOME = 'Mercado (nome não lido)';

export interface NotaLida {
  mercado: string;
  data?: string; // ISO
  itens: ItemNota[];
  total: number;
}

/** O conteúdo do QR da NFC-e é uma URL com o parâmetro p=<chave de 44 dígitos>|... */
export function extrairChave(conteudoQr: string): string | null {
  const m = conteudoQr.match(/(\d{44})/);
  return m ? m[1] : null;
}

export function pareceQrNfce(conteudo: string): boolean {
  return /^https?:\/\//i.test(conteudo) && extrairChave(conteudo) !== null;
}

export function numeroBr(texto: string): number {
  // pega o último número do texto ("Qtde.:2" → "2", "Vl. Unit.: 21,90" → "21,90")
  const achados = texto.match(/[\d.,]*\d/g);
  const limpo = achados ? achados[achados.length - 1] : '';
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number(limpo);
}

function semTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function spanDeClasse(trecho: string, classe: string): string | null {
  const re = new RegExp(`<span[^>]*class=["'][^"']*\\b${classe}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i');
  const m = trecho.match(re);
  return m ? semTags(m[1]) : null;
}

export function lerPaginaNfce(html: string): NotaLida | null {
  const tabela = html.match(/<table[^>]*id=["']tabResult["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tabela) return null;

  const itens: ItemNota[] = [];
  const linhas = tabela[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of linhas) {
    const nome = spanDeClasse(tr, 'txtTit');
    const valor = spanDeClasse(tr, 'valor');
    if (!nome || !valor) continue;
    const qtd = numeroBr(spanDeClasse(tr, 'Rqtd') ?? '1') || 1;
    const un = (spanDeClasse(tr, 'RUN') ?? '').replace(/^UN:?\s*/i, '').replace(/\d+$/, '').trim() || 'UN';
    const unit = spanDeClasse(tr, 'RvlUnit');
    const codigo = (spanDeClasse(tr, 'RCod') ?? '').match(/\d{8,14}/)?.[0];
    const valorTotal = numeroBr(valor);
    itens.push({
      descricao: nome,
      quantidade: qtd,
      unidade: un,
      valorUnitario: unit ? numeroBr(unit) : Math.round((valorTotal / qtd) * 100) / 100,
      valorTotal,
      ...(codigo ? { codigo } : {}),
    });
  }
  if (itens.length === 0) return null;

  const lojaM = html.match(/<div[^>]*id=["']u20["'][^>]*>([\s\S]*?)<\/div>/i);
  const mercado = lojaM ? nomeDoMercado(semTags(lojaM[1])) : SEM_NOME;

  const texto = semTags(html);
  const dataM = texto.match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)?/i);
  const data = dataM ? `${dataM[3]}-${dataM[2]}-${dataM[1]}T${(dataM[4] ?? '12:00').padEnd(8, ':00').slice(0, 8)}` : undefined;

  const totalM = texto.match(/Valor a pagar R\$:?\s*([\d.,]+)/i) ?? texto.match(/Valor total R\$:?\s*([\d.,]+)/i);
  const total = totalM
    ? numeroBr(totalM[1])
    : Math.round(itens.reduce((s, i) => s + i.valorTotal, 0) * 100) / 100;

  return { mercado, data, itens, total };
}

/**
 * Lê o TEXTO da página da nota (selecionar tudo e copiar no Safari), para quando o app
 * não consegue baixar a página sozinho (versão web). Formato do portal de SC:
 *   LIMAO TAITI kg (Código: 8386 )
 *   Qtde.:0,615UN: KG1Vl. Unit.:   14,99	Vl. Total
 *   9,22
 */
export function lerTextoNfce(texto: string): NotaLida | null {
  const t = texto.replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const re = /^[ \t]*([^\n]+?)\s*\(C[óo]digo:\s*(\d+)\s*\)\s*Qtde\.:\s*([\d.,]+)\s*UN:\s*([A-Za-z]+?)\d*\s*Vl\. Unit\.:\s*([\d.,]+)\s*Vl\. Total\s*([\d.,]+)/gm;
  const itens: ItemNota[] = [];
  for (const m of t.matchAll(re)) {
    const codigo = m[2].length >= 8 ? m[2] : undefined;
    itens.push({
      descricao: m[1].trim(),
      quantidade: numeroBr(m[3]) || 1,
      unidade: m[4].toUpperCase(),
      valorUnitario: numeroBr(m[5]),
      valorTotal: numeroBr(m[6]),
      ...(codigo ? { codigo } : {}),
    });
  }
  if (itens.length === 0) return null;

  const lojaM = t.match(/ELETR[ÔO]NICA\s*\n+\s*([^\n]+)/i) ?? t.match(/([^\n]+)\s*\n\s*CNPJ/i);
  let mercado = lojaM ? nomeDoMercado(lojaM[1]) : SEM_NOME;
  if (mercado === SEM_NOME) {
    // último recurso: alguma rede conhecida mencionada em qualquer parte do texto
    const rede = REDES.find(([re]) => re.test(t));
    if (rede) mercado = rede[1];
  }
  const dataM = t.match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)?/i);
  const data = dataM ? `${dataM[3]}-${dataM[2]}-${dataM[1]}T${(dataM[4] ?? '12:00').padEnd(8, ':00').slice(0, 8)}` : undefined;
  const totalM = t.match(/Valor a pagar R\$:?\s*([\d.,]+)/i) ?? t.match(/Valor total R\$:?\s*([\d.,]+)/i);
  const total = totalM ? numeroBr(totalM[1]) : Math.round(itens.reduce((a, i) => a + i.valorTotal, 0) * 100) / 100;
  return { mercado, data, itens, total };
}

/** Baixa a página da URL do QR e tenta ler. Lança erro se a rede falhar. */
export async function buscarNfce(url: string): Promise<NotaLida | null> {
  const resp = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!resp.ok) throw new Error(`Portal respondeu ${resp.status}`);
  return lerPaginaNfce(await resp.text());
}
