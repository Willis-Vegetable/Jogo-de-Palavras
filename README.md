# Jogo de Palavras

Jogo casual de adivinhação em português brasileiro, com a direção visual **Gráfica de Bolso**.

## Executar localmente

Requer Node.js 20 ou superior.

```sh
npm install
npm run dev
```

Abra a URL local indicada pelo Vite no terminal.

## Comandos

```sh
npm test
npm run check
npm run build
npm run preview
```

## Funcionalidades

- Desafio diário e prática livre, com progresso separado.
- Modos de palpite por letras e por definição.
- Níveis leve (4 letras/7 tentativas), normal (5/6) e desafiador (7/5).
- Acentos normalizados, feedback para letras repetidas e validação de palpites locais.
- Estatísticas, sequência diária, coleção de palavras e compartilhamento sem spoiler.
- Interface responsiva, teclado virtual, operação por teclado e estados descritos por texto e símbolos além das cores.
- Fontes empacotadas localmente; sem anúncios nem chamadas a provedores de fontes externos.

O progresso fica neste dispositivo, em `localStorage`. O ranking exibido é demonstrativo e não sincroniza resultados entre pessoas. Ranking real entre amigos exige API, armazenamento no servidor, autenticação de convidados e autorização de grupos, conforme [PROJETO_TECNICO.md](PROJETO_TECNICO.md).

O catálogo de palavras é local e curado para demonstração; revisar e ampliar o léxico antes de publicar o jogo para uso contínuo.