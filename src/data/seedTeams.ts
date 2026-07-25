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

function makeSquad(prefix: string): Player[] {
  return SQUAD_TEMPLATE.map((position, i) => {
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
  article: 'o' | 'a'; // "o Brasil", "a Argentina" — gênero do nome do país em português
  country: string;
  primary: string;
  secondary: string;
  button: string;
  rating: number;
}

// Brasil, Argentina + potências mundiais (nomes de seleção).
const SEEDS: SeedDef[] = [
  { name: 'Brasil', short: 'BRA', article: 'o', country: 'BR', primary: '#f7d417', secondary: '#0a4ea2', button: '#f7d417', rating: 92 },
  { name: 'Argentina', short: 'ARG', article: 'a', country: 'AR', primary: '#6cc6e8', secondary: '#ffffff', button: '#6cc6e8', rating: 91 },
  { name: 'França', short: 'FRA', article: 'a', country: 'FR', primary: '#1e3a8a', secondary: '#ffffff', button: '#1e3a8a', rating: 90 },
  { name: 'Alemanha', short: 'GER', article: 'a', country: 'DE', primary: '#ffffff', secondary: '#111111', button: '#dddddd', rating: 88 },
  { name: 'Espanha', short: 'ESP', article: 'a', country: 'ES', primary: '#c60b1e', secondary: '#f7d417', button: '#c60b1e', rating: 87 },
  { name: 'Inglaterra', short: 'ENG', article: 'a', country: 'GB', primary: '#ffffff', secondary: '#0a4ea2', button: '#eeeeee', rating: 87 },
  { name: 'Portugal', short: 'POR', article: 'o', country: 'PT', primary: '#006600', secondary: '#c60b1e', button: '#c60b1e', rating: 86 },
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
    squad: makeSquad(s.short),
    rating: s.rating,
  }));
}

/** Retorna dois times para uma partida rápida (Brasil x Argentina por padrão). */
export function seedTeams(): [Team, Team] {
  const all = buildSeedTeams();
  return [all[0], all[1]];
}
