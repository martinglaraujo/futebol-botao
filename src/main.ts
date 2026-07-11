import Phaser from 'phaser';
import { GAME } from '@/config/constants';
import { MatchScene } from '@/scenes/MatchScene';

/**
 * ============================================================
 *  MAIN — ponto de entrada e configuração do motor
 * ============================================================
 * Configura o Phaser com o backend de física MATTER.JS, que dá o
 * comportamento realista de choque/deslizamento dos botões na mesa:
 *   - gravity {x:0, y:0}  → visão de topo (mesa), sem queda vertical.
 *   - frictionAir por corpo → simula o atrito da superfície da mesa.
 *   - restitution → elasticidade dos choques botão-a-botão e com a bola.
 *
 * Escala RESPONSIVA (Scale.FIT + CENTER_BOTH) garante que a mesma
 * página se adapte a tablet e celular (ex.: Redmi Pad 2), mantendo a
 * proporção 16:10 sem distorção.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL com fallback para Canvas
  parent: 'game',
  backgroundColor: GAME.BG_COLOR,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 }, // mesa vista de cima
      // debug: true,          // habilite para ver corpos/vetores durante o dev
      enableSleeping: true,    // corpos "dormem" ao parar → economia e detecção de repouso
    },
  },
  input: {
    activePointers: 3, // multi-touch (útil para multiplayer local futuro)
  },
  scene: [MatchScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

// Trava a orientação em landscape quando o navegador permitir (tablets/celulares).
if (screen.orientation && 'lock' in screen.orientation) {
  (screen.orientation as unknown as { lock: (o: string) => Promise<void> })
    .lock('landscape')
    .catch(() => {
      /* alguns navegadores exigem fullscreen antes; ignoramos silenciosamente */
    });
}
