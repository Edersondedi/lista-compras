import { Platform } from 'react-native';
import type { PalavraOcr } from './lib/cupom';
import { circuloPelaCor, LinhaPrint } from './lib/importarNotas';

/**
 * Leitura de texto em fotos (OCR) com o Tesseract.js, rodando no próprio navegador do celular:
 * a foto não sai do aparelho. Na primeira vez baixa ~5 MB (programa + dicionário em português).
 * Só funciona na versão web (Safari/Chrome).
 */

export const ocrDisponivel = Platform.OS === 'web' && typeof window !== 'undefined';

const VERSAO = '7.0.0';
type Tess = { createWorker: (lang: string, oem?: number, opts?: object) => Promise<TessWorker> };
type TessWorker = {
  setParameters: (p: Record<string, string>) => Promise<unknown>;
  recognize: (img: unknown, opts?: object, out?: object) => Promise<{ data: { text: string; blocks: TessBlock[] | null } }>;
};
type TessBlock = {
  paragraphs: {
    lines: { text: string; confidence: number; bbox: { y0: number; y1: number }; words: { text: string; bbox: { y0: number; y1: number } }[] }[];
  }[];
};

let carregar: Promise<Tess> | null = null;
let worker: Promise<TessWorker> | null = null;
let progresso: ((p: number) => void) | null = null;

function tesseract(): Promise<Tess> {
  const w = window as unknown as { Tesseract?: Tess };
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  carregar ??= new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = `https://cdn.jsdelivr.net/npm/tesseract.js@${VERSAO}/dist/tesseract.min.js`;
    s.onload = () => (w.Tesseract ? ok(w.Tesseract) : erro(new Error('OCR não carregou')));
    s.onerror = () => {
      carregar = null;
      erro(new Error('Não consegui baixar o leitor de fotos. Confira a internet e tente de novo.'));
    };
    document.head.appendChild(s);
  });
  return carregar;
}

function obterWorker(): Promise<TessWorker> {
  worker ??= tesseract()
    .then((T) =>
      T.createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') progresso?.(m.progress);
        },
      }),
    )
    .catch((e) => {
      worker = null;
      throw e;
    });
  return worker;
}

/** Abre a câmera (ou, com camera=false, a galeria/prints) do celular e devolve a foto escolhida. */
export function escolherFoto(camera = true): Promise<File | null> {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (camera) input.setAttribute('capture', 'environment');
    input.onchange = () => ok(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => ok(null));
    input.click();
  });
}

/** Reduz/aumenta para ~1800 px de largura, tons de cinza e mais contraste: melhora a leitura de cupom térmico. */
async function preparar(foto: File, largura: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(foto);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não consegui abrir a foto.'));
      i.src = url;
    });
    const escala = Math.min(3, largura / Math.max(img.width, 1));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const cinza = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = Math.max(0, Math.min(255, (cinza - 128) * 1.6 + 140));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ResultadoOcr {
  texto: string;
  palavras: PalavraOcr[];
}

/**
 * Lê o texto da foto. Cupom: uma passada em 1800 px. Etiqueta: o preço grande só é lido com a foto reduzida,
 * então passe várias larguras (ex.: [1000, 600]); as alturas das palavras voltam na escala da primeira largura.
 */
export async function lerFoto(
  foto: File,
  aoProgredir?: (p: number) => void,
  larguras: number[] = [1800],
  modo: 'cupom' | 'etiqueta' = 'cupom',
): Promise<ResultadoOcr> {
  if (!ocrDisponivel) throw new Error('Ler por foto funciona na versão do navegador (Safari).');
  const w = await obterWorker();
  // 6 = bloco único de texto (cupom); 11 = texto esparso (etiqueta, com preço grande solto)
  await w.setParameters({ tessedit_pageseg_mode: modo === 'cupom' ? '6' : '11' });
  const textos: string[] = [];
  const palavras: PalavraOcr[] = [];
  try {
    for (let k = 0; k < larguras.length; k++) {
      const img = await preparar(foto, larguras[k]);
      progresso = aoProgredir ? (p) => aoProgredir((k + p) / larguras.length) : null;
      const r = await w.recognize(img, {}, { text: true, blocks: true });
      textos.push(r.data.text);
      const fator = larguras[0] / larguras[k];
      for (const b of r.data.blocks ?? [])
        for (const p of b.paragraphs) for (const l of p.lines) for (const x of l.words) palavras.push({ texto: x.text, altura: (x.bbox.y1 - x.bbox.y0) * fator });
    }
    return { texto: textos.join('\n'), palavras };
  } finally {
    progresso = null;
  }
}

async function abrirImagem(foto: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(foto);
  try {
    return await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não consegui abrir a imagem.'));
      i.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Print de uma lista do app Notas: lê o texto sem a coluna dos círculos e, para cada linha,
 * olha a faixa da esquerda — círculo amarelo (marcado), círculo cinza (vazio) ou nada (continuação da linha de cima).
 */
export async function lerPrintNotas(foto: File, aoProgredir?: (p: number) => void): Promise<LinhaPrint[]> {
  if (!ocrDisponivel) throw new Error('Importar do Notas funciona na versão do navegador (Safari).');
  const img = await abrirImagem(foto);
  const escala = Math.min(1, 1400 / img.width);
  const W = Math.round(img.width * escala);
  const H = Math.round(img.height * escala);
  const tela = document.createElement('canvas');
  tela.width = W;
  tela.height = H;
  const ctx = tela.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);

  const faixa = Math.round(W * 0.15); // onde ficam os círculos
  const px = ctx.getImageData(0, 0, faixa, H).data;
  const amarelos = new Int32Array(H);
  const tinta = new Int32Array(H);
  for (let y = 0; y < H; y++) {
    const fundo = (y * faixa + 2) * 4; // cor de fundo desta linha (modo claro ou escuro)
    for (let x = 0; x < faixa; x++) {
      const i = (y * faixa + x) * 4;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (r > 170 && g > 120 && b < 120 && r - b > 80) amarelos[y]++;
      if (Math.abs(r - px[fundo]) + Math.abs(g - px[fundo + 1]) + Math.abs(b - px[fundo + 2]) > 60) tinta[y]++;
    }
  }

  const recorte = document.createElement('canvas');
  recorte.width = W - faixa;
  recorte.height = H;
  recorte.getContext('2d')!.drawImage(tela, faixa, 0, W - faixa, H, 0, 0, W - faixa, H);

  const w = await obterWorker();
  await w.setParameters({ tessedit_pageseg_mode: '4' });
  progresso = aoProgredir ?? null;
  try {
    const r = await w.recognize(recorte, {}, { text: true, blocks: true });
    const linhas: LinhaPrint[] = [];
    for (const b of r.data.blocks ?? [])
      for (const p of b.paragraphs)
        for (const l of p.lines) {
          const y0 = Math.max(0, l.bbox.y0 - 8);
          const y1 = Math.min(H - 1, l.bbox.y1 + 8);
          let am = 0;
          let ti = 0;
          for (let y = y0; y <= y1; y++) {
            am += amarelos[y];
            ti += tinta[y];
          }
          linhas.push({ texto: l.text.trim(), confianca: l.confidence, circulo: circuloPelaCor(am, ti, y1 - y0 + 1) });
        }
    return linhas;
  } finally {
    progresso = null;
  }
}
