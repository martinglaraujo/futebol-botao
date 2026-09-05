import { SEED_LIST, seedIndex } from '@/data/seedTeams';

/** Personalizações do jogador — salvas no navegador e aplicadas ao (re)iniciar a partida. */
export interface GameSettings {
  homeTeam: number; // índice em SEED_LIST
  awayTeam: number;
  homeColor: string; // cor do botão (hex)
  awayColor: string;
  fieldColor: string;
  lineColor: string;
  ballColor: string;
  halfMinutes: number;
  maxTouches: number; // toques totais na jogada
  maxSameButton: number; // toques seguidos com o mesmo botão
  fouls: boolean; // faltas e cartões automáticos
}

const KEY = 'botaofc.settings.v2'; // v2: lista de seleções mudou (índices diferentes)

export function defaultSettings(): GameSettings {
  return {
    homeTeam: seedIndex('BRA'),
    awayTeam: seedIndex('ARG'),
    homeColor: SEED_LIST[seedIndex('BRA')].color,
    awayColor: SEED_LIST[seedIndex('ARG')].color,
    fieldColor: '#0f7a34',
    lineColor: '#ffffff',
    ballColor: '#ffffff',
    halfMinutes: 5,
    maxTouches: 12,
    maxSameButton: 3,
    fouls: true,
  };
}

const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const hex = (v: unknown, fallback: string): string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;

/** Lê e valida as configurações salvas; qualquer valor inválido volta pro padrão. */
export function loadSettings(): GameSettings {
  const d = defaultSettings();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GameSettings> | null;
    if (!raw) return d;
    const n = SEED_LIST.length;
    const home = num(raw.homeTeam, 0, n - 1, d.homeTeam);
    let away = num(raw.awayTeam, 0, n - 1, d.awayTeam);
    if (away === home) away = (home + 1) % n;
    return {
      homeTeam: home,
      awayTeam: away,
      homeColor: hex(raw.homeColor, SEED_LIST[home].color),
      awayColor: hex(raw.awayColor, SEED_LIST[away].color),
      fieldColor: hex(raw.fieldColor, d.fieldColor),
      lineColor: hex(raw.lineColor, d.lineColor),
      ballColor: hex(raw.ballColor, d.ballColor),
      halfMinutes: num(raw.halfMinutes, 1, 15, d.halfMinutes),
      maxTouches: num(raw.maxTouches, 3, 30, d.maxTouches),
      maxSameButton: num(raw.maxSameButton, 1, 10, d.maxSameButton),
      fouls: typeof raw.fouls === 'boolean' ? raw.fouls : d.fouls,
    };
  } catch {
    return d;
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento local — vale só até recarregar */
  }
}
