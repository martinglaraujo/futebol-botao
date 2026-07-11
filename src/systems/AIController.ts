import Phaser from 'phaser';
import { AI, PHYSICS } from '@/config/constants';
import type { ButtonEntity } from '@/entities/ButtonEntity';

/**
 * Turno da CPU: escolhe o botão mais próximo da bola e mira num ponto
 * "fantasma" atrás dela (como na sinuca) para que o choque empurre a bola
 * em direção ao gol adversário. A força vem do atributo `power` do
 * jogador; a precisão da mira degrada conforme `control` é menor.
 */
export class AIController {
  constructor(private scene: Phaser.Scene) {}

  playTurn(
    buttons: ButtonEntity[],
    ball: MatterJS.BodyType,
    opponentGoal: { x: number; y: number },
    onDone: () => void,
  ): void {
    const active = buttons.filter((b) => !b.sentOff);
    if (active.length === 0) {
      onDone();
      return;
    }

    const striker = active.reduce((closest, b) =>
      Phaser.Math.Distance.BetweenPoints(b.body.position, ball.position) <
      Phaser.Math.Distance.BetweenPoints(closest.body.position, ball.position)
        ? b
        : closest,
    );

    // Ponto "fantasma": onde o botão precisa chegar para empurrar a bola
    // rumo ao gol adversário (mira estilo bola-de-sinuca).
    const toGoalX = opponentGoal.x - ball.position.x;
    const toGoalY = opponentGoal.y - ball.position.y;
    const toGoalLen = Math.hypot(toGoalX, toGoalY) || 1;
    const contactDist = PHYSICS.BALL_RADIUS + PHYSICS.BUTTON_RADIUS + 2;
    const ghostX = ball.position.x - (toGoalX / toGoalLen) * contactDist;
    const ghostY = ball.position.y - (toGoalY / toGoalLen) * contactDist;

    const aimX = ghostX - striker.body.position.x;
    const aimY = ghostY - striker.body.position.y;
    const aimLen = Math.hypot(aimX, aimY) || 1;

    // Erro de ângulo: 0 com control=100, até MAX_AIM_ERROR_DEG com control=0.
    const control = striker.player.attributes.control; // 0..100
    const maxErrorRad = Phaser.Math.DegToRad(AI.MAX_AIM_ERROR_DEG) * (1 - control / 100);
    const errorRad = Phaser.Math.FloatBetween(-maxErrorRad, maxErrorRad);
    const cos = Math.cos(errorRad);
    const sin = Math.sin(errorRad);
    const ux = aimX / aimLen;
    const uy = aimY / aimLen;
    const nx = ux * cos - uy * sin;
    const ny = ux * sin + uy * cos;

    const powerFactor = 0.6 + striker.player.attributes.power / 100; // 0.6..1.6
    const force = PHYSICS.FLICK_MAX_FORCE * AI.FORCE_FACTOR * powerFactor;

    // Pequena pausa de "pensamento" antes de bater — evita reação instantânea.
    this.scene.time.delayedCall(Phaser.Math.Between(AI.THINK_MS_MIN, AI.THINK_MS_MAX), () => {
      this.scene.matter.body.applyForce(striker.body, striker.body.position, {
        x: nx * force,
        y: ny * force,
      });
      console.log(`[IA] ${striker.player.name} petelecou (força=${force.toFixed(3)})`);
      onDone();
    });
  }
}
