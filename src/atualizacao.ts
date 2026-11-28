import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * O GitHub Pages deixa o celular guardar a página por até 10 minutos, e o ícone da Tela de Início às vezes mais.
 * Aqui o app confere se existe versão nova (comparando o arquivo principal publicado com o que está rodando).
 */
function versaoRodando(): { base: string; entry: string } | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const src = [...document.scripts].map((s) => s.src).find((s) => /\/_expo\/static\/js\/web\/entry-[0-9a-f]+\.js/.test(s));
  if (!src) return null;
  return { base: src.split('/_expo/')[0], entry: src.match(/entry-[0-9a-f]+/)![0] };
}

async function existeVersaoNova(): Promise<boolean> {
  const v = versaoRodando();
  if (!v) return false;
  try {
    const html = await fetch(`${v.base}/index.html?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : ''));
    const publicada = html.match(/entry-[0-9a-f]+/)?.[0];
    return !!publicada && publicada !== v.entry;
  } catch {
    return false;
  }
}

export function recarregarNaVersaoNova() {
  const u = new URL(window.location.href);
  u.searchParams.set('v', String(Date.now()));
  window.location.replace(u.toString());
}

/** Ao abrir: se houver versão nova, recarrega sozinho. Depois (ao voltar para o app): avisa com um botão. */
export function useVersaoNova(): boolean {
  const [nova, setNova] = useState(false);
  useEffect(() => {
    if (!versaoRodando()) return;
    const inicio = Date.now();
    const conferir = () =>
      existeVersaoNova().then((sim) => {
        if (!sim) return;
        if (Date.now() - inicio < 8000) recarregarNaVersaoNova();
        else setNova(true);
      });
    conferir();
    const aoVoltar = () => document.visibilityState === 'visible' && conferir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);
  return nova;
}
