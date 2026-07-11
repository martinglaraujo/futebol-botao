import type { Position } from '@/models';

/**
 * Catálogo de ESQUEMAS TÁTICOS.
 *
 * Cada formação é descrita por LINHAS (do gol para o ataque). O número de
 * titulares = soma das contagens das linhas; o restante do elenco vai para
 * o banco de reservas.
 *
 * Isso permite trocar o esquema por um dropdown: menos titulares => mais
 * botões no banco; mais titulares => campo mais cheio.
 */
export interface FormationLine {
  role: Position;
  count: number;
}

export interface Formation {
  id: string;
  name: string;
  lines: FormationLine[];
}

/** Total de titulares de um esquema. */
export function starterCount(f: Formation): number {
  return f.lines.reduce((sum, l) => sum + l.count, 0);
}

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3-of',
    name: '4-3-3 Ofensivo',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 4 },
      { role: 'MEI', count: 3 },
      { role: 'ATA', count: 3 },
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 4 },
      { role: 'MEI', count: 4 },
      { role: 'ATA', count: 2 },
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 3 },
      { role: 'MEI', count: 5 },
      { role: 'ATA', count: 2 },
    ],
  },
  {
    id: '5-3-2',
    name: '5-3-2 Defensivo',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 5 },
      { role: 'MEI', count: 3 },
      { role: 'ATA', count: 2 },
    ],
  },
  {
    id: 'botao-6',
    name: 'Botão Clássico (6)',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 2 },
      { role: 'MEI', count: 2 },
      { role: 'ATA', count: 1 },
    ],
  },
  {
    id: 'botao-5',
    name: 'Reduzido (5)',
    lines: [
      { role: 'GOL', count: 1 },
      { role: 'ZAG', count: 2 },
      { role: 'MEI', count: 1 },
      { role: 'ATA', count: 1 },
    ],
  },
];

export const DEFAULT_FORMATION_ID = '4-3-3-of';

export function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}
