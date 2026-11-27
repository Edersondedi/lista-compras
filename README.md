# Lista de Compras

App de lista de compras da casa com comparação de preços entre supermercados e ofertas de clube/cooperado.
Expo (React Native) + TypeScript, para iPhone e Android.

## O que já funciona (MVP, dados só no celular)

- **Lista**: itens por categoria, quantidade, marcar como comprado, limpar comprados.
- **Provavelmente acabando**: sugere itens pela frequência das compras registradas.
- **Nota fiscal**: lê o QR Code da NFC-e e baixa os itens do portal da Sefaz; se não conseguir, oferece digitação manual. Ao salvar, marca os itens da lista que foram comprados.
- **Comparar**: custo da lista em cada mercado pelo último preço registrado, ranking e melhor divisão em 2 mercados.
- **Promoções**: cadastro de ofertas (para todos ou só clube) e dos mercados em que você é cadastrado. Preço de clube só conta onde você é cadastrado.

## Limitações conhecidas

- **Parser da NFC-e não validado com nota real de SC.** Segue o layout comum dos portais estaduais (`src/lib/nfce.ts`). Primeira tarefa: escanear uma nota real e ajustar.
- Total da comparação soma 1 unidade de cada item (quantidade da lista é texto livre).
- Sem login nem sincronização: a lista ainda não é compartilhada entre dois celulares (próxima fase: Supabase).
- Ofertas de clube entram à mão; integração com as redes depende de parceria.

## Rodar no celular

1. Instale o Node.js 20+ no computador e o app **Expo Go** no celular.
2. No terminal, dentro da pasta do projeto:
   ```bash
   npm install
   npx expo start
   ```
3. Escaneie o QR Code que aparece no terminal com a câmera (iPhone) ou com o Expo Go (Android). Celular e computador na mesma rede Wi-Fi.

## Desenvolvimento

```bash
npm test           # testes da lógica de comparação, sugestões e leitura da NFC-e
npm run typecheck  # checagem de tipos
```

Estrutura: telas em `src/app/` (Expo Router, uma aba por arquivo), lógica pura em `src/lib/`, estado persistido em `src/store.ts`.
