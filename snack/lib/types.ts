export type Categoria =
  | 'Mercearia'
  | 'Hortifrúti'
  | 'Frios e laticínios'
  | 'Carnes'
  | 'Bebidas'
  | 'Limpeza'
  | 'Higiene'
  | 'Outros';

export const CATEGORIAS: Categoria[] = [
  'Mercearia',
  'Hortifrúti',
  'Frios e laticínios',
  'Carnes',
  'Bebidas',
  'Limpeza',
  'Higiene',
  'Outros',
];

export interface ItemLista {
  id: string;
  nome: string;
  quantidade: string; // texto livre: "2 un", "5 kg"
  categoria: Categoria;
  comprado: boolean;
  criadoEm: string; // ISO
}

export interface ItemNota {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  codigo?: string; // GTIN/EAN quando a nota trouxer
}

export interface NotaFiscal {
  id: string;
  mercado: string;
  data: string; // ISO
  itens: ItemNota[];
  total: number;
  origem: 'qrcode' | 'manual';
  url?: string;
}

export interface Oferta {
  id: string;
  item: string;
  mercado: string;
  precoNormal?: number;
  precoOferta: number;
  tipo: 'todos' | 'clube';
  validade?: string; // ISO (dia)
  fonte?: 'encarte' | 'menorpreco' | 'site'; // de onde veio o preço
  criadoEm?: string; // ISO, quando foi anotada
}
