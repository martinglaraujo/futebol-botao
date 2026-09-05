import { uid } from '@/utils/id';
import type { Team, Player, Position, Kit } from '@/models';

/**
 * Seleções iniciais embutidas. São editáveis/duplicáveis no Modo Criar.
 * Aqui geramos elencos genéricos (nomes fictícios) — o usuário renomeia/edita.
 */

// Elenco de 16: cobre qualquer esquema (11 titulares no máximo) + banco.
const SQUAD_TEMPLATE: Position[] = [
  'GOL', 'GOL',
  'ZAG', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'ZAG',
  'MEI', 'MEI', 'MEI', 'MEI', 'MEI',
  'ATA', 'ATA', 'ATA',
];

// Elenco do Brasil definido pelo usuário (número da camisa → posição).
const BRASIL_POSITIONS: Record<number, Position> = {
  1: 'GOL', 2: 'GOL',
  3: 'ZAG', 4: 'ZAG', 11: 'ZAG', 12: 'ZAG', 16: 'ZAG',
  5: 'MEI', 6: 'MEI', 8: 'MEI', 13: 'MEI', 14: 'MEI', 15: 'MEI',
  7: 'ATA', 9: 'ATA', 10: 'ATA',
};

function makeSquad(prefix: string, positionByNumber?: Record<number, Position>): Player[] {
  return SQUAD_TEMPLATE.map((templatePosition, i) => {
    const position = positionByNumber?.[i + 1] ?? templatePosition;
    const p: Player = {
      id: uid('ply_'),
      name: `${prefix} ${i + 1}`,
      number: i + 1,
      position,
      attributes: {
        power: position === 'ATA' ? 78 : 60,
        weight: position === 'ZAG' || position === 'GOL' ? 75 : 55,
        control: position === 'MEI' ? 80 : 62,
      },
      appearance: {
        skinTone: '#c98a5e',
        hairColor: '#1a1a1a',
        hairStyle: 'curto',
        facePreset: 'default',
        bootsColor: '#111111',
      },
    };
    return p;
  });
}

function kit(name: string, primary: string, secondary: string, button: string): Kit {
  return {
    id: uid('kit_'),
    name,
    shirt: { type: 'solid', primary, secondary, detail: '#ffffff' },
    shorts: secondary,
    socks: primary,
    buttonColor: button,
  };
}

interface SeedDef {
  name: string;
  short: string;
  article: 'o' | 'a' | 'os'; // "o Brasil", "a Argentina", "os Estados Unidos" — artigo do nome do país
  country: string;
  primary: string;
  secondary: string;
  button: string;
  rating: number;
}

// Seleções disponíveis (ordem alfabética, como aparece na escolha de times).
const SEEDS: SeedDef[] = [
  { name: 'Alemanha', short: 'GER', article: 'a', country: 'DE', primary: '#ffffff', secondary: '#111111', button: '#dddddd', rating: 88 },
  { name: 'Argentina', short: 'ARG', article: 'a', country: 'AR', primary: '#6cc6e8', secondary: '#ffffff', button: '#6cc6e8', rating: 91 },
  { name: 'Bélgica', short: 'BEL', article: 'a', country: 'BE', primary: '#c8102e', secondary: '#fdda24', button: '#c8102e', rating: 87 },
  { name: 'Brasil', short: 'BRA', article: 'o', country: 'BR', primary: '#f7d417', secondary: '#0a4ea2', button: '#f7d417', rating: 92 },
  { name: 'Colômbia', short: 'COL', article: 'a', country: 'CO', primary: '#fcd116', secondary: '#003893', button: '#fcd116', rating: 84 },
  { name: 'Coreia do Sul', short: 'KOR', article: 'a', country: 'KR', primary: '#cd2e3a', secondary: '#0047a0', button: '#cd2e3a', rating: 80 },
  { name: 'Escócia', short: 'SCO', article: 'a', country: 'SC', primary: '#0065bd', secondary: '#ffffff', button: '#0065bd', rating: 78 },
  { name: 'Espanha', short: 'ESP', article: 'a', country: 'ES', primary: '#c60b1e', secondary: '#f7d417', button: '#c60b1e', rating: 87 },
  { name: 'Estados Unidos', short: 'USA', article: 'os', country: 'US', primary: '#ffffff', secondary: '#1c3f94', button: '#1c3f94', rating: 80 },
  { name: 'França', short: 'FRA', article: 'a', country: 'FR', primary: '#1e3a8a', secondary: '#ffffff', button: '#1e3a8a', rating: 90 },
  { name: 'Inglaterra', short: 'ENG', article: 'a', country: 'GB', primary: '#ffffff', secondary: '#0a4ea2', button: '#eeeeee', rating: 87 },
  { name: 'Itália', short: 'ITA', article: 'a', country: 'IT', primary: '#0a4ea2', secondary: '#ffffff', button: '#0a4ea2', rating: 85 },
];

export function buildSeedTeams(): Team[] {
  return SEEDS.map((s) => ({
    id: uid('team_'),
    name: s.name,
    shortName: s.short,
    article: s.article,
    country: s.country,
    crestRef: `preset:crest-${s.country}`,
    colors: { primary: s.primary, secondary: s.secondary },
    kits: [
      kit('Titular', s.primary, s.secondary, s.button),
      kit('Reserva', s.secondary, s.primary, s.secondary),
    ],
    squad: makeSquad(s.short, s.short === 'BRA' ? BRASIL_POSITIONS : undefined),
    rating: s.rating,
    // Brasil: laterais (3,4) e zagueiros (11,12); meias abertos (5,6) e volante (8) adiantado;
    // pontas (7,9) e centroavante (10).
    ...(s.short === 'BRA' ? { lineup: [1, 3, 11, 12, 4, 5, 8, 6, 7, 10, 9], advanced: [8] } : {}),
  }));
}

/** Nome e cor padrão de cada seleção (pra telas de escolha/personalização). */
/** Índice de uma seleção em SEED_LIST pela sigla (ex.: 'BRA'). */
export function seedIndex(short: string): number {
  return SEEDS.findIndex((t) => t.short === short);
}

export const SEED_LIST = SEEDS.map((t) => ({ name: t.name, short: t.short, color: t.button, secondary: t.secondary }));

/** Retorna os dois times da partida (índices em SEED_LIST; padrão: Brasil x Argentina). */
export function seedTeams(homeIndex = seedIndex('BRA'), awayIndex = seedIndex('ARG')): [Team, Team] {
  const all = buildSeedTeams();
  return [all[homeIndex], all[awayIndex]];
}
