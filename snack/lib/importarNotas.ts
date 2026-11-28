import { normalizar } from './logic';

/**
 * Importação de uma lista do app Notas (iPhone).
 * Do print: cada linha lida pelo OCR vem com o que havia à esquerda dela: círculo marcado, círculo vazio ou nada.
 * Do texto colado: aceita marcadores comuns (✓, ☑, ✅, [x], - [x]) para os marcados.
 */

export type Circulo = 'marcado' | 'vazio' | null;

export interface LinhaPrint {
  texto: string;
  confianca: number; // 0-100, do OCR
  circulo: Circulo;
}

export interface ItemImportado {
  nome: string;
  quantidade: string;
  marcado: boolean;
}

const letras = (s: string) => (s.match(/[A-Za-zÀ-ú]/g) ?? []).length;

/** "2 Milho lata" -> {quantidade: "2", nome: "Milho lata"}; "200g coco" -> {"200g", "coco"}. */
export function separarQuantidade(texto: string): { nome: string; quantidade: string } {
  const t = texto.trim().replace(/\s{2,}/g, ' ');
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l|lt|un|und|pct|cx|dz|x)?\.?\s+(.{2,})$/i);
  if (!m) return { nome: t, quantidade: '' };
  return { nome: m[3].trim(), quantidade: `${m[1]}${m[2] ? m[2].toLowerCase() : ''}` };
}

const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function itensDoPrint(linhas: LinhaPrint[]): ItemImportado[] {
  const itens: ItemImportado[] = [];
  for (const l of linhas) {
    const texto = l.texto.trim();
    if (l.confianca < 60 || letras(texto) < 3) continue;
    if (l.circulo) {
      const { nome, quantidade } = separarQuantidade(texto);
      itens.push({ nome: capitalizar(nome), quantidade, marcado: l.circulo === 'marcado' });
    } else if (itens.length) {
      // linha sem círculo logo depois de um item = continuação do texto dele
      itens[itens.length - 1].nome += ` ${texto}`;
    }
    // sem círculo antes do primeiro item: cabeçalho, hora, botões — ignora
  }
  return limparDuplicados(itens);
}

const MARCADO = /^\s*(?:[-*•]\s*)?(?:\[[xX✓]\]|☑|✅|✔|✓)\s*/;
const VAZIO = /^\s*(?:[-*•]\s*)?(?:\[\s?\]|☐|○|◯|⚪)\s*/;

export function itensDoTexto(texto: string): ItemImportado[] {
  const itens: ItemImportado[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    if (!bruta.trim()) continue;
    const marcado = MARCADO.test(bruta);
    const limpo = bruta.replace(MARCADO, '').replace(VAZIO, '').replace(/^\s*[-*•]\s+/, '').trim();
    if (letras(limpo) < 2) continue;
    const { nome, quantidade } = separarQuantidade(limpo);
    itens.push({ nome: capitalizar(nome), quantidade, marcado });
  }
  // texto sem nenhum marcador: o app não tem como saber o que estava marcado, então deixa tudo para a pessoa escolher
  return limparDuplicados(itens);
}

function limparDuplicados(itens: ItemImportado[]): ItemImportado[] {
  const vistos = new Set<string>();
  return itens.filter((i) => {
    const k = normalizar(i.nome);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Classifica cada linha pelo que há na faixa da esquerda (contagem de pixels amarelos e de "tinta"). */
export function circuloPelaCor(amarelos: number, tinta: number, altura: number): Circulo {
  if (amarelos > altura * 2) return 'marcado';
  if (tinta > altura * 0.6) return 'vazio';
  return null;
}
