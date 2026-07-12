/**
 * Constantes globais do jogo.
 * Regra do projeto: NADA de números mágicos espalhados — tudo vive aqui.
 * Ajuste o "feel" do peteleco/atrito editando FIELD e PHYSICS.
 */

// --- Dimensões lógicas do jogo (a câmera escala isto para caber na tela) ---
// 16:10 casa bem com o Redmi Pad 2 em landscape.
export const GAME = {
  WIDTH: 1280,
  HEIGHT: 800,
  BG_COLOR: '#0b6b2e',
} as const;

// --- Mesa / campo ---
export const FIELD = {
  MARGIN: 80, // distância da linha de fundo até a borda da mesa (campo um pouco menor => bola alcança a lateral com mais frequência, FORA acontece de verdade)
  LINE_COLOR: 0xffffff,
  LINE_ALPHA: 0.85,
  LINE_WIDTH: 3,
  GOAL_WIDTH: 200, // abertura do gol (eixo Y)
  GOAL_DEPTH: 34,
} as const;

// --- Física do "botão" (Matter.js) ---
// Estes valores definem a mecânica de choque/deslizamento na mesa.
export const PHYSICS = {
  // Botão
  BUTTON_RADIUS: 17,
  BUTTON_MASS: 6, // massa relativa (botão de acrílico é "pesado")
  BUTTON_FRICTION_AIR: 0.022, // atrito da mesa: quão rápido o botão para. ↑ = para mais cedo
  BUTTON_RESTITUTION: 0.55, // elasticidade no choque botão-a-botão
  BUTTON_FRICTION: 0.05, // atrito de contato (deslize entre corpos)

  // Bola (mais leve, escorrega mais e quica mais)
  BALL_RADIUS: 12,
  BALL_MASS: 1.2,
  BALL_FRICTION_AIR: 0.02,
  BALL_RESTITUTION: 0.72,

  // Peteleco (a força aplicada ao arrastar-e-soltar)
  FLICK_MAX_DRAG: 180, // pixels de arrasto que equivalem à força máxima
  FLICK_MAX_FORCE: 0.18, // impulso máximo aplicado ao botão
  FLICK_MIN_DRAG: 8, // abaixo disso, ignora (toque acidental)

  // Paredes da mesa
  WALL_RESTITUTION: 0.4,

  // Considera o botão "parado" abaixo desta velocidade (fim do turno)
  REST_SPEED_THRESHOLD: 0.12,

  // Trava de segurança: se nunca convergir pro repouso (oscilação residual
  // por atrito/restituição), força a parada após esse tempo — sem isso o
  // turno pode ficar preso pra sempre e a vez nunca chega ao adversário.
  SETTLE_TIMEOUT_MS: 6000,
} as const;

// --- Regras de jogo ---
export const RULES = {
  MATCH_MINUTES: 5, // duração padrão (tempo de jogo simulado)
  PLAYERS_PER_TEAM: 11, // botões em campo por time (goleiro + 10 linha)
  YELLOW_BEFORE_RED: 2, // 2 amarelos = vermelho
  MAX_TURN_SECONDS: 15, // tempo para bater o peteleco antes de perder o turno
  CPU_SIDE: 'away' as TeamSide, // lado jogado pela IA; o outro é humano
} as const;

// --- Controle de toques ---
// O time mantém a posse enquanto continuar tocando a bola, respeitando os
// limites abaixo. Ao estourar um limite (ou simplesmente não tocar a bola
// no peteleco), a posse passa pro adversário.
export const TOUCH_RULES = {
  MAX_SAME_BUTTON: 3, // toques consecutivos com o MESMO botão antes de perder a posse
  MAX_TOTAL: 12, // toques totais na posse (qualquer botão do time) antes de perder a posse
} as const;

// --- IA ---
export const AI = {
  THINK_MS_MIN: 500, // pausa mínima antes do peteleco (parece "pensar")
  THINK_MS_MAX: 1100,
  MAX_AIM_ERROR_DEG: 11, // erro de ângulo com control=0; escala linear até 0 com control=100
  FORCE_FACTOR: 1.0, // fração do FLICK_MAX_FORCE usada como base da tacada da IA
} as const;

// --- Faltas (automáticas, por física) ---
// Um peteleco no talo produz velocidade ~10; cai pra ~7 em poucos frames.
// Colisão entre botões de TIMES DIFERENTES acima do limiar vira falta —
// só a pancada bem forte e direta conta, não qualquer toque de bola parada.
export const FOULS = {
  IMPACT_SPEED_THRESHOLD: 8,
  REPEAT_COOLDOWN_MS: 800, // evita contar o mesmo choque 2x (múltiplos pares na mesma colisão)
} as const;

export type TeamSide = 'home' | 'away';
