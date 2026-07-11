# Futebol de Botão ⚽🔘

Jogo de futebol de botão **offline** e altamente **customizável**, rodando no navegador (PWA) e adaptado para tablet/celular (testado mirando o **Redmi Pad 2**, landscape).

## Stack

- **Phaser 3** — engine de jogo 2D.
- **Matter.js** — física de corpos rígidos (atrito de mesa, impulso do peteleco, choques elásticos).
- **TypeScript + Vite** — dev rápido com HMR.
- **PWA** — instalável e jogável offline.

## Rodando

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

Para testar no tablet na mesma rede Wi-Fi: o Vite sobe com `host:true`.
Acesse `http://<IP-do-seu-PC>:5173` no navegador do Redmi Pad 2.

```bash
npm run build && npm run preview   # build de produção + servidor local
```

## Como jogar (protótipo atual)

- **Peteleco**: toque num botão do time da vez, arraste no sentido oposto (estilingue) e solte.
- **Zoom**: pinça / roda do mouse. Ao aproximar, os botões revelam os jogadores miniatura.
- Gols são detectados por sensores atrás da linha; o turno alterna quando tudo para.

## Arquitetura

```
src/
├── config/        # constantes globais (física, campo, regras)
├── models/        # interfaces do "Modo Criar" (Team, Player, Kit, Stadium...) — 100% JSON
├── entities/      # ButtonEntity (corpo físico + render dual botão/jogador)
├── systems/       # FlickController (peteleco), SaveSystem (persistência local)
├── scenes/        # MatchScene (campo, paredes, gols, turnos, LOD)
├── data/          # seedTeams (Brasil, Argentina + potências)
├── utils/         # helpers
└── main.ts        # configuração do motor (Matter, escala responsiva)
```

## Roadmap (próximos passos)

- [ ] `AIController` — turno da CPU (mira + força por atributos).
- [ ] Sistema de faltas + cartões (amarelo/vermelho remove o botão — `ButtonEntity.destroy()` já pronto).
- [ ] Telas de menu, **Modo Criar** (editores de time/jogador/estádio) e HUD de placar/tempo.
- [ ] Modos **Campeonato (Liga)** e **Copinha do Mundo** (usando `Competition`).
- [ ] Áudio de hinos e animações de comemoração (assets locais + IndexedDB para blobs).
- [ ] Multiplayer local (mesma tela) — `activePointers` já habilitado.
```
