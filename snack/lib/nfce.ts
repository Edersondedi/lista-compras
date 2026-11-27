import { ItemNota } from './types';

/**
 * Leitura da página de consulta pública da NFC-e (a URL que vem no QR Code do cupom).
 *
 * HIPÓTESE A VALIDAR COM NOTA REAL DE SC: o parser segue o layout "padrão" usado por
 * vários portais estaduais (tabela #tabResult com spans .txtTit, .Rqtd, .RUN,
 * .RvlUnit e .valor; nome da loja em #u20). Se o portal de SC usar outro layout,
 * `lerPaginaNfce` devolve null e o app oferece a digitação manual.
 */

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
    const un = (spanDeClasse(tr, 'RUN') ?? '').replace(/^UN:?\s*/i, '').trim() || 'UN';
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
  const mercado = lojaM ? semTags(lojaM[1]) : 'Mercado (nome não lido)';

  const texto = semTags(html);
  const dataM = texto.match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)?/i);
  const data = dataM ? `${dataM[3]}-${dataM[2]}-${dataM[1]}T${(dataM[4] ?? '12:00').padEnd(8, ':00').slice(0, 8)}` : undefined;

  const totalM = texto.match(/Valor a pagar R\$:?\s*([\d.,]+)/i) ?? texto.match(/Valor total R\$:?\s*([\d.,]+)/i);
  const total = totalM
    ? numeroBr(totalM[1])
    : Math.round(itens.reduce((s, i) => s + i.valorTotal, 0) * 100) / 100;

  return { mercado, data, itens, total };
}

/** Baixa a página da URL do QR e tenta ler. Lança erro se a rede falhar. */
export async function buscarNfce(url: string): Promise<NotaLida | null> {
  const resp = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!resp.ok) throw new Error(`Portal respondeu ${resp.status}`);
  return lerPaginaNfce(await resp.text());
}
