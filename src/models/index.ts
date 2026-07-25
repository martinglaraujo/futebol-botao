/**
 * ============================================================
 *  MODELOS DE DADOS — "MODO CRIAR"
 * ============================================================
 * Toda customização do jogo é descrita por estas interfaces.
 * Regra de ouro: tudo aqui deve ser 100% serializável em JSON
 * (nada de funções/classes), para salvar/carregar do localStorage
 * ou exportar/importar um arquivo .json.
 *
 * Versionamos o schema (SCHEMA_VERSION) para permitir migrações
 * futuras sem quebrar saves antigos.
 */

export const SCHEMA_VERSION = 1;

/** Cor no formato hex string, ex: "#ff2200". */
export type HexColor = string;

/**
 * Referência a um asset local. Pode ser:
 *  - 'preset:xxx'   → asset embutido no jogo (public/assets)
 *  - 'data:...'     → data URL (imagem/áudio importados pelo usuário)
 *  - 'blob-id:uuid' → chave no armazenamento local de blobs (IndexedDB)
 */
export type AssetRef = string;

// ------------------------------------------------------------
// JOGADOR (o "boneco" dentro do botão)
// ------------------------------------------------------------

export type Position = 'GOL' | 'ZAG' | 'MEI' | 'ATA';

/** Atributos que influenciam a física/IA de cada botão individual. */
export interface PlayerAttributes {
  power: number;   // 0..100 → multiplica a força do peteleco
  weight: number;  // 0..100 → massa/inércia do botão (defensor "trava" mais)
  control: number; // 0..100 → reduz o atrito no deslize (mira mais precisa)
}

/** Aparência do jogador revelada no zoom/gol/Modo Criar. */
export interface PlayerAppearance {
  skinTone: HexColor;
  hairColor: HexColor;
  hairStyle: string;       // id de sprite: 'curto' | 'careca' | 'moicano' ...
  facePreset: string;      // id de sprite de rosto
  bootsColor: HexColor;
  spriteOverride?: AssetRef; // imagem custom importada substitui o boneco procedural
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  attributes: PlayerAttributes;
  appearance: PlayerAppearance;
}

// ------------------------------------------------------------
// UNIFORME
// ------------------------------------------------------------

export interface KitPattern {
  type: 'solid' | 'stripes' | 'hoops' | 'sash' | 'custom';
  primary: HexColor;
  secondary: HexColor;
  detail: HexColor;
  textureRef?: AssetRef; // textura custom (sobrepõe o pattern procedural)
}

export interface Kit {
  id: string;
  name: string;         // "Uniforme 1", "Away", etc.
  shirt: KitPattern;
  shorts: HexColor;
  socks: HexColor;
  buttonColor: HexColor; // cor do botão de acrílico na visão distante
}

// ------------------------------------------------------------
// TIME
// ------------------------------------------------------------

export interface Team {
  id: string;
  name: string;
  shortName: string;      // 3 letras: "BRA", "ARG"
  article: 'o' | 'a';     // artigo em português: "o Brasil", "a Argentina"
  country: string;        // código ISO: "BR", "AR" ...
  crestRef: AssetRef;     // escudo
  colors: {
    primary: HexColor;
    secondary: HexColor;
  };
  kits: Kit[];            // pelo menos [0]=titular, [1]=reserva
  squad: Player[];        // elenco
  anthemRef?: AssetRef;   // hino (áudio local)
  celebrationId?: string; // id de animação de comemoração
  rating: number;         // 0..100 força geral (seed da IA e do sorteio)
}

// ------------------------------------------------------------
// ESTÁDIO / MESA
// ------------------------------------------------------------

export interface Stadium {
  id: string;
  name: string;
  tableColor: HexColor;   // cor da mesa/gramado
  lineColor: HexColor;    // linhas de marcação
  lineStyle: 'classic' | 'minimal' | 'retro';
  netStyle: 'square' | 'hex' | 'none';
  crowdRef?: AssetRef;    // textura/ambiente de arquibancada
  ambienceRef?: AssetRef; // som ambiente local
}

// ------------------------------------------------------------
// COSMÉTICOS (hinos, comemorações)
// ------------------------------------------------------------

export interface Celebration {
  id: string;
  name: string;
  spriteSheetRef: AssetRef; // animação de comemoração
  durationMs: number;
}

// ------------------------------------------------------------
// COMPETIÇÕES
// ------------------------------------------------------------

export type CompetitionFormat = 'league' | 'worldcup';

export interface Competition {
  id: string;
  name: string;
  format: CompetitionFormat;
  teamIds: string[];      // referências a Team.id
  // Progresso persistido da temporada (tabela, chaveamento, rodada atual).
  state?: unknown;
}

// ------------------------------------------------------------
// RAIZ DO SAVE — o que efetivamente vai pro localStorage/arquivo
// ------------------------------------------------------------

export interface GameSave {
  schemaVersion: number;
  updatedAt: string; // ISO date
  teams: Team[];
  stadiums: Stadium[];
  celebrations: Celebration[];
  competitions: Competition[];
  settings: {
    sfxVolume: number;   // 0..1
    musicVolume: number; // 0..1
    lastStadiumId?: string;
  };
}

/** Save vazio válido — ponto de partida do jogo. */
export function createEmptySave(): GameSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    teams: [],
    stadiums: [],
    celebrations: [],
    competitions: [],
    settings: { sfxVolume: 0.8, musicVolume: 0.6 },
  };
}
