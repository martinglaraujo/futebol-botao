import Phaser from 'phaser';
import { PHYSICS } from '@/config/constants';
import type { ButtonEntity } from '@/entities/ButtonEntity';

/**
 * Controle de PETELECO por arrastar-e-soltar (touch/mouse).
 *
 * Mecânica:
 *  1. Toque em um botão do time da vez → seleciona.
 *  2. Arrasta na direção OPOSTA ao alvo (estilo estilingue).
 *  3. Solta → aplica impulso = vetor(arrasto) * força, modulado por atributo "power".
 *
 * Desenha uma seta de mira enquanto arrasta.
 */
export class FlickController {
  private scene: Phaser.Scene;
  private aim: Phaser.GameObjects.Graphics;
  private selected: ButtonEntity | null = null;
  private startPoint = new Phaser.Math.Vector2();
  private getFlickable: () => ButtonEntity[];
  private onFlick: (btn: ButtonEntity) => void;

  constructor(
    scene: Phaser.Scene,
    getFlickable: () => ButtonEntity[],
    onFlick: (btn: ButtonEntity) => void,
  ) {
    this.scene = scene;
    this.getFlickable = getFlickable;
    this.onFlick = onFlick;
    this.aim = scene.add.graphics().setDepth(50);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  /** Habilita/desabilita entrada (ex.: durante o turno da IA ou bola em movimento). */
  enabled = true;

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    const p = this.worldPoint(pointer);
    // Seleciona o botão mais próximo do toque, dentro do raio de pega.
    let best: ButtonEntity | null = null;
    let bestDist = PHYSICS.BUTTON_RADIUS * 1.8;
    for (const btn of this.getFlickable()) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, btn.body.position.x, btn.body.position.y);
      if (d < bestDist) {
        best = btn;
        bestDist = d;
      }
    }
    if (best) {
      this.selected = best;
      this.startPoint.set(best.body.position.x, best.body.position.y);
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.selected) return;
    const p = this.worldPoint(pointer);
    this.drawAim(this.startPoint.x, this.startPoint.y, p.x, p.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const btn = this.selected;
    this.selected = null;
    this.aim.clear();
    if (!btn) return;

    const p = this.worldPoint(pointer);
    // Vetor estilingue: puxa para trás → dispara para frente.
    const dragX = this.startPoint.x - p.x;
    const dragY = this.startPoint.y - p.y;
    const drag = Math.hypot(dragX, dragY);
    if (drag < PHYSICS.FLICK_MIN_DRAG) return; // toque acidental

    const clamped = Math.min(drag, PHYSICS.FLICK_MAX_DRAG) / PHYSICS.FLICK_MAX_DRAG;
    const powerFactor = 0.5 + btn.player.attributes.power / 100; // 0.5..1.5
    const force = PHYSICS.FLICK_MAX_FORCE * clamped * powerFactor;

    const nx = dragX / drag;
    const ny = dragY / drag;
    // Impulso vetorial direto no corpo Matter.
    this.scene.matter.body.applyForce(
      btn.body,
      btn.body.position,
      { x: nx * force, y: ny * force },
    );

    this.onFlick(btn);
  }

  private drawAim(x0: number, y0: number, px: number, py: number): void {
    const dragX = x0 - px;
    const dragY = y0 - py;
    const drag = Math.min(Math.hypot(dragX, dragY), PHYSICS.FLICK_MAX_DRAG);
    const ang = Math.atan2(dragY, dragX);
    const tipX = x0 + Math.cos(ang) * drag;
    const tipY = y0 + Math.sin(ang) * drag;

    // cor de força: verde → vermelho conforme a intensidade
    const t = drag / PHYSICS.FLICK_MAX_DRAG;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(80, 220, 120),
      new Phaser.Display.Color(240, 80, 60),
      100,
      t * 100,
    );
    const hex = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

    this.aim.clear();
    this.aim.lineStyle(4, hex, 0.9);
    this.aim.lineBetween(x0, y0, tipX, tipY);
    this.aim.fillStyle(hex, 0.9);
    this.aim.fillCircle(tipX, tipY, 6);
  }

  private worldPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
  }
}
