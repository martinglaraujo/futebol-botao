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
  MARGIN: 60, // distância da linha de fundo até a borda da mesa
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
} as const;

// --- Regras de jogo ---
export const RULES = {
  MATCH_MINUTES: 5, // duração padrão (tempo de jogo simulado)
  PLAYERS_PER_TEAM: 11, // botões em campo por time (goleiro + 10 linha)
  YELLOW_BEFORE_RED: 2, // 2 amarelos = vermelho
  MAX_TURN_SECONDS: 15, // tempo para bater o peteleco antes de perder o turno
} as const;

export type TeamSide = 'home' | 'away';
