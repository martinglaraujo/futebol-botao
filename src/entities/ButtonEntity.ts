import Phaser from 'phaser';
import { PHYSICS, TeamSide } from '@/config/constants';
import type { Player } from '@/models';

/**
 * Um botão em campo.
 *
 * Renderização DUAL (requisito de perspectiva):
 *  - Visão distante  -> desenha o disco de acrílico (this.discGfx).
 *  - Visão aproximada -> revela o sprite do jogador (this.playerSprite).
 * Trocamos a visibilidade conforme o zoom da câmera (ver MatchScene.updateLOD).
 *
 * Física (Matter): corpo circular com massa/atrito/restituição vindos das
 * constantes, modulados pelos atributos do jogador (peso/controle).
 */
export class ButtonEntity {
  readonly id: string;
  readonly side: TeamSide;
  readonly player: Player;
  readonly body: MatterJS.BodyType;

  private scene: Phaser.Scene;
  private discGfx: Phaser.GameObjects.Container;
  private playerSprite: Phaser.GameObjects.Container;

  // Estado disciplinar
  yellowCards = 0;
  sentOff = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: TeamSide,
    player: Player,
    buttonColor: number,
  ) {
    this.scene = scene;
    this.id = player.id;
    this.side = side;
    this.player = player;

    // --- Corpo físico (Matter) ---
    // weight ↑ => mais massa (botão "trava"); control ↑ => menos atrito de ar (desliza melhor).
    const weightFactor = 0.5 + player.attributes.weight / 100; // 0.5..1.5
    const controlFactor = 1 - player.attributes.control / 300;  // ~0.66..1

    this.body = scene.matter.add.circle(x, y, PHYSICS.BUTTON_RADIUS, {
      label: `button:${side}:${player.id}`,
      restitution: PHYSICS.BUTTON_RESTITUTION,
      friction: PHYSICS.BUTTON_FRICTION,
      frictionAir: PHYSICS.BUTTON_FRICTION_AIR * controlFactor,
      mass: PHYSICS.BUTTON_MASS * weightFactor,
    }) as MatterJS.BodyType;

    // --- Visual distante: o botão de acrílico ---
    this.discGfx = this.buildDisc(buttonColor);
    // --- Visual aproximado: o jogador miniatura ---
    this.playerSprite = this.buildPlayerSprite();
    this.playerSprite.setVisible(false);
  }

  /** Desenha o disco clássico: base + anel + brilho + número. */
  private buildDisc(color: number): Phaser.GameObjects.Container {
    const r = PHYSICS.BUTTON_RADIUS;
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(2, 3, r); // sombra
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(3, 0xffffff, 0.25);
    g.strokeCircle(0, 0, r - 2); // anel de acrílico
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(-r * 0.3, -r * 0.35, r * 0.9, r * 0.5); // brilho

    const num = this.scene.add
      .text(0, 0, String(this.player.number), {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    return this.scene.add.container(0, 0, [g, num]).setDepth(10);
  }

  /** Placeholder procedural do jogador (substituído por sprite custom no Modo Criar). */
  private buildPlayerSprite(): Phaser.GameObjects.Container {
    const ap = this.player.appearance;
    const g = this.scene.add.graphics();
    // corpo (camisa)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(ap.bootsColor).color, 1);
    g.fillRoundedRect(-10, -4, 20, 22, 4);
    // cabeça
    g.fillStyle(Phaser.Display.Color.HexStringToColor(ap.skinTone).color, 1);
    g.fillCircle(0, -12, 8);
    // cabelo
    g.fillStyle(Phaser.Display.Color.HexStringToColor(ap.hairColor).color, 1);
    g.fillEllipse(0, -16, 16, 8);
    return this.scene.add.container(0, 0, [g]).setDepth(11);
  }

  /** Alterna o nível de detalhe conforme o zoom (LOD). */
  setDetailed(detailed: boolean): void {
    this.discGfx.setVisible(!detailed);
    this.playerSprite.setVisible(detailed);
  }

  /** Sincroniza os visuais com a posição/rotação do corpo físico. Chamar no update(). */
  sync(): void {
    const { position, angle } = this.body;
    this.discGfx.setPosition(position.x, position.y).setRotation(angle);
    this.playerSprite.setPosition(position.x, position.y);
  }

  /** Velocidade escalar atual (para saber quando o botão parou). */
  get speed(): number {
    const v = this.body.velocity;
    return Math.hypot(v.x, v.y);
  }

  /** Remove do campo (cartão vermelho). */
  destroy(): void {
    this.scene.matter.world.remove(this.body);
    this.discGfx.destroy();
    this.playerSprite.destroy();
    this.sentOff = true;
  }
}
