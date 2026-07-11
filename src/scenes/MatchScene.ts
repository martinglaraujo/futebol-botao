import Phaser from 'phaser';
import { GAME, FIELD, PHYSICS, RULES, type TeamSide } from '@/config/constants';
import { ButtonEntity } from '@/entities/ButtonEntity';
import { FlickController } from '@/systems/FlickController';
import { AIController } from '@/systems/AIController';
import { seedTeams } from '@/data/seedTeams';
import { getFormation, DEFAULT_FORMATION_ID, type Formation } from '@/data/formations';
import { FormationBar } from '@/ui/FormationBar';
import { Scoreboard } from '@/ui/Scoreboard';
import type { Team, Player, Position } from '@/models';

/**
 * MatchScene — o campo de jogo e toda a física do choque dos botões.
 *
 * Responsabilidades:
 *  - Desenhar a mesa/gramado e as linhas.
 *  - Criar as paredes físicas (bordas) e os sensores de gol.
 *  - Instanciar botões (2 times) + bola.
 *  - Alternar turnos (home/away) e detectar quando tudo parou.
 *  - LOD: aproximar a câmera revela os jogadores; distante mostra os botões.
 */
export class MatchScene extends Phaser.Scene {
  private buttons: ButtonEntity[] = [];
  private ball!: MatterJS.BodyType;
  private ballGfx!: Phaser.GameObjects.Arc;
  private flick!: FlickController;
  private ai!: AIController;
  private turn: TeamSide = 'home';
  private detailed = false;
  private score = { home: 0, away: 0 };
  private homeTeam!: Team;
  private awayTeam!: Team;
  private formationId: Record<TeamSide, string> = {
    home: DEFAULT_FORMATION_ID,
    away: DEFAULT_FORMATION_ID,
  };
  private benchGfx: Record<TeamSide, Phaser.GameObjects.Container | null> = {
    home: null,
    away: null,
  };
  private formationBar!: FormationBar;
  private scoreboard!: Scoreboard;

  constructor() {
    super('MatchScene');
  }

  create(): void {
    const [home, away] = seedTeams();
    this.homeTeam = home;
    this.awayTeam = away;

    this.matter.world.setBounds(0, 0, GAME.WIDTH, GAME.HEIGHT); // fallback
    this.cameras.main.setBackgroundColor(GAME.BG_COLOR);

    this.drawTable();
    this.buildWalls();
    this.buildGoals();
    this.spawnBall();
    this.spawnTeam(home, 'home');
    this.spawnTeam(away, 'away');

    // Só o time humano da vez pode ser petelecado; e só quando tudo está parado.
    this.flick = new FlickController(
      this,
      () =>
        this.everythingStopped() && this.turn !== RULES.CPU_SIDE
          ? this.buttons.filter((b) => b.side === this.turn && !b.sentOff)
          : [],
      () => this.onFlickResolved(),
    );
    this.ai = new AIController(this);

    this.setupZoomControls();

    // Dropdown de esquema tático por time.
    this.formationBar = new FormationBar(home.name, away.name, (side, id) => {
      this.formationId[side] = id;
      this.rebuildTeam(side);
    });
    this.scoreboard = new Scoreboard(home.shortName, away.shortName);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.formationBar.destroy();
      this.scoreboard.destroy();
    });
  }

  // ---------- Construção do campo ----------

  private drawTable(): void {
    const g = this.add.graphics().setDepth(0);
    // gramado da mesa
    g.fillStyle(Phaser.Display.Color.HexStringToColor('#0f7a34').color, 1);
    g.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    // faixas alternadas
    g.fillStyle(0xffffff, 0.03);
    for (let i = 0; i < GAME.WIDTH; i += 120) g.fillRect(i, 0, 60, GAME.HEIGHT);

    // linhas de marcação
    g.lineStyle(FIELD.LINE_WIDTH, FIELD.LINE_COLOR, FIELD.LINE_ALPHA);
    g.strokeRect(FIELD.MARGIN, FIELD.MARGIN, GAME.WIDTH - FIELD.MARGIN * 2, GAME.HEIGHT - FIELD.MARGIN * 2);
    g.lineBetween(GAME.WIDTH / 2, FIELD.MARGIN, GAME.WIDTH / 2, GAME.HEIGHT - FIELD.MARGIN); // meio
    g.strokeCircle(GAME.WIDTH / 2, GAME.HEIGHT / 2, 90); // círculo central
  }

  /** Paredes físicas nas 4 bordas (menos as aberturas dos gols). */
  private buildWalls(): void {
    const t = 40; // espessura
    const opt = { isStatic: true, restitution: PHYSICS.WALL_RESTITUTION, label: 'wall' };
    const w = GAME.WIDTH;
    const h = GAME.HEIGHT;
    const gy = (h - FIELD.GOAL_WIDTH) / 2; // início vertical da abertura do gol

    // topo e base (inteiras)
    this.matter.add.rectangle(w / 2, FIELD.MARGIN - t / 2, w, t, opt);
    this.matter.add.rectangle(w / 2, h - FIELD.MARGIN + t / 2, w, t, opt);
    // laterais divididas pela abertura do gol
    // esquerda (2 pedaços)
    this.matter.add.rectangle(FIELD.MARGIN - t / 2, gy / 2 + FIELD.MARGIN / 2, t, gy, opt);
    this.matter.add.rectangle(FIELD.MARGIN - t / 2, h - gy / 2 - FIELD.MARGIN / 2, t, gy, opt);
    // direita (2 pedaços)
    this.matter.add.rectangle(w - FIELD.MARGIN + t / 2, gy / 2 + FIELD.MARGIN / 2, t, gy, opt);
    this.matter.add.rectangle(w - FIELD.MARGIN + t / 2, h - gy / 2 - FIELD.MARGIN / 2, t, gy, opt);
  }

  private buildGoals(): void {
    const h = GAME.HEIGHT;
    const cy = h / 2;
    // Gol é detectado por POSIÇÃO no update() (checkBall), não por sensor —
    // evita a bola encalhar no bolso do gol sem cruzar o sensor.

    // desenho da rede
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1.5, 0xffffff, 0.4);
    for (const gx of [FIELD.MARGIN, GAME.WIDTH - FIELD.MARGIN]) {
      const dir = gx < GAME.WIDTH / 2 ? -1 : 1;
      for (let y = cy - FIELD.GOAL_WIDTH / 2; y <= cy + FIELD.GOAL_WIDTH / 2; y += 12) {
        g.lineBetween(gx, y, gx + dir * FIELD.GOAL_DEPTH, y);
      }
      for (let d = 0; d <= FIELD.GOAL_DEPTH; d += 12) {
        g.lineBetween(gx + dir * d, cy - FIELD.GOAL_WIDTH / 2, gx + dir * d, cy + FIELD.GOAL_WIDTH / 2);
      }
    }
  }

  private spawnBall(): void {
    this.ball = this.matter.add.circle(GAME.WIDTH / 2, GAME.HEIGHT / 2, PHYSICS.BALL_RADIUS, {
      label: 'ball',
      restitution: PHYSICS.BALL_RESTITUTION,
      frictionAir: PHYSICS.BALL_FRICTION_AIR,
      mass: PHYSICS.BALL_MASS,
    }) as MatterJS.BodyType;
    this.ballGfx = this.add.circle(GAME.WIDTH / 2, GAME.HEIGHT / 2, PHYSICS.BALL_RADIUS, 0xffffff).setDepth(20);
  }

  /** Escolhe os titulares para as vagas do esquema; o resto vira banco. */
  private allocate(squad: Player[], formation: Formation): { starters: { player: Player; role: Position }[]; bench: Player[] } {
    const used = new Set<string>();
    const starters: { player: Player; role: Position }[] = [];
    for (const line of formation.lines) {
      for (let i = 0; i < line.count; i++) {
        // Prefere um jogador da posição da vaga; se não houver, pega qualquer um livre.
        const preferred = squad.find((p) => !used.has(p.id) && p.position === line.role);
        const pick = preferred ?? squad.find((p) => !used.has(p.id));
        if (!pick) break;
        used.add(pick.id);
        starters.push({ player: pick, role: line.role });
      }
    }
    const bench = squad.filter((p) => !used.has(p.id));
    return { starters, bench };
  }

  /**
   * Posiciona os titulares por LINHAS do esquema (gol → ataque), espalhando
   * cada linha verticalmente. Os reservas vão para o banco (visual).
   */
  private spawnTeam(team: Team, side: TeamSide): void {
    const formation = getFormation(this.formationId[side]);
    const { starters, bench } = this.allocate(team.squad, formation);
    const buttonColor = Phaser.Display.Color.HexStringToColor(team.kits[0].buttonColor).color;

    // home ataca para a direita: gol perto da borda, ataque perto do meio.
    const goalX = side === 'home' ? FIELD.MARGIN + 34 : GAME.WIDTH - FIELD.MARGIN - 34;
    const targetX = side === 'home' ? GAME.WIDTH * 0.46 : GAME.WIDTH * 0.54;

    // Linhas do campo (marcações): distribuímos DENTRO desse vão vertical.
    const fieldTop = FIELD.MARGIN;
    const fieldBottom = GAME.HEIGHT - FIELD.MARGIN;
    const span = fieldBottom - fieldTop;

    const lineCount = formation.lines.length;
    let cursor = 0;
    formation.lines.forEach((line, li) => {
      const depth = lineCount === 1 ? 0 : li / (lineCount - 1);
      const x = goalX + (targetX - goalX) * depth;
      // Dividir o setor em (count + 1) intervalos => botões equidistantes
      // entre si E entre as linhas de limite do campo (por setor).
      for (let i = 0; i < line.count; i++) {
        const { player } = starters[cursor++];
        const y = fieldTop + (span * (i + 1)) / (line.count + 1);
        this.buttons.push(new ButtonEntity(this, x, y, side, player, buttonColor));
      }
    });

    this.drawBench(side, bench, buttonColor);
  }

  /**
   * Desenha o banco de reservas na margem (fora das linhas), sem física.
   * Cada time fica no seu próprio lado do campo (home à esquerda, away à
   * direita) — assim o vão central do topo sobra livre para o Scoreboard.
   */
  private drawBench(side: TeamSide, bench: Player[], buttonColor: number): void {
    this.benchGfx[side]?.destroy();
    const y = side === 'home' ? GAME.HEIGHT - 26 : 26;
    const centerX = side === 'home' ? GAME.WIDTH * 0.25 : GAME.WIDTH * 0.75;
    const startX = centerX - ((bench.length - 1) * 30) / 2;
    const items: Phaser.GameObjects.GameObject[] = [];
    bench.forEach((player, i) => {
      const cx = startX + i * 30;
      const g = this.add.graphics();
      g.fillStyle(buttonColor, 0.5);
      g.fillCircle(cx, y, 11);
      g.lineStyle(1.5, 0xffffff, 0.4);
      g.strokeCircle(cx, y, 11);
      const num = this.add
        .text(cx, y, String(player.number), { fontFamily: 'Arial', fontSize: '9px', color: '#ffffff' })
        .setOrigin(0.5)
        .setAlpha(0.85);
      items.push(g, num);
    });
    this.benchGfx[side] = this.add.container(0, 0, items).setDepth(5);
  }

  /** Remove os botões e o banco de um lado e re-monta com o esquema atual. */
  private rebuildTeam(side: TeamSide): void {
    for (const b of this.buttons.filter((b) => b.side === side)) b.destroy();
    this.buttons = this.buttons.filter((b) => b.side !== side);
    this.benchGfx[side]?.destroy();
    this.benchGfx[side] = null;
    this.spawnTeam(side === 'home' ? this.homeTeam : this.awayTeam, side);
  }

  // ---------- Turnos e movimento ----------

  private everythingStopped(): boolean {
    const ballSpeed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y);
    if (ballSpeed > PHYSICS.REST_SPEED_THRESHOLD) return false;
    return this.buttons.every((b) => b.sentOff || b.speed <= PHYSICS.REST_SPEED_THRESHOLD);
  }

  private onFlickResolved(): void {
    // O turno alterna assim que o movimento cessar (checado no update()).
    this.awaitingRest = true;
    this.flick.enabled = false;
  }

  /** Centro do gol adversário do lado informado (para onde a IA mira). */
  private opponentGoalOf(side: TeamSide): { x: number; y: number } {
    const x = side === 'home' ? GAME.WIDTH - FIELD.MARGIN : FIELD.MARGIN;
    return { x, y: GAME.HEIGHT / 2 };
  }

  private playCpuTurn(): void {
    const strikers = this.buttons.filter((b) => b.side === this.turn && !b.sentOff);
    this.ai.playTurn(strikers, this.ball, this.opponentGoalOf(this.turn), () => this.onFlickResolved());
  }

  private awaitingRest = false;

  /**
   * Detecção de gol/saída POR POSIÇÃO (chamado todo frame).
   * - Cruzou a linha de fundo dentro das traves  → GOL.
   * - Cruzou a linha em qualquer outro ponto/ficou presa fora → volta ao jogo.
   * Um cooldown evita disparar duas vezes durante o reset.
   */
  private checkBall(): void {
    if (this.ballDeadFrames > 0) {
      this.ballDeadFrames--;
      return;
    }
    const { x, y } = this.ball.position;
    const cy = GAME.HEIGHT / 2;
    const inGoalBand = Math.abs(y - cy) <= FIELD.GOAL_WIDTH / 2;
    const leftLine = FIELD.MARGIN;
    const rightLine = GAME.WIDTH - FIELD.MARGIN;

    // Passou da linha esquerda
    if (x <= leftLine + PHYSICS.BALL_RADIUS) {
      if (inGoalBand && x <= leftLine) this.onGoal('away'); // gol contra o mandante
      else if (x < leftLine - 4) this.throwBackIn(y); // encalhou fora → devolve
      return;
    }
    // Passou da linha direita
    if (x >= rightLine - PHYSICS.BALL_RADIUS) {
      if (inGoalBand && x >= rightLine) this.onGoal('home');
      else if (x > rightLine + 4) this.throwBackIn(y);
    }
  }

  /** Recoloca a bola em jogo (tiro de lateral simplificado ao centro). */
  private throwBackIn(y: number): void {
    const clampedY = Phaser.Math.Clamp(y, FIELD.MARGIN + 60, GAME.HEIGHT - FIELD.MARGIN - 60);
    this.matter.body.setPosition(this.ball, { x: GAME.WIDTH / 2, y: clampedY });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
  }

  private ballDeadFrames = 0;

  private onGoal(scorer: TeamSide): void {
    this.score[scorer] += 1;
    this.scoreboard.update(this.score.home, this.score.away);
    // TODO: zoom-in de comemoração + hino + reset de posições.
    this.cameras.main.flash(300, 255, 255, 255);
    this.resetKickoff();
    console.log(`[GOL] ${this.homeTeam.shortName} ${this.score.home} x ${this.score.away} ${this.awayTeam.shortName}`);
  }

  private resetKickoff(): void {
    this.matter.body.setPosition(this.ball, { x: GAME.WIDTH / 2, y: GAME.HEIGHT / 2 });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
  }

  // ---------- LOD / Zoom (perspectiva dinâmica) ----------

  private setupZoomControls(): void {
    // Pinça no tablet / roda do mouse controla o zoom.
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.6, 2.4));
    });
  }

  private updateLOD(): void {
    const shouldDetail = this.cameras.main.zoom >= 1.6;
    if (shouldDetail !== this.detailed) {
      this.detailed = shouldDetail;
      for (const b of this.buttons) b.setDetailed(shouldDetail);
    }
  }

  update(): void {
    for (const b of this.buttons) b.sync();
    this.ballGfx.setPosition(this.ball.position.x, this.ball.position.y);
    this.checkBall();
    this.updateLOD();

    // Fim do movimento → passa o turno e reabilita o peteleco.
    if (this.awaitingRest && this.everythingStopped()) {
      this.awaitingRest = false;
      this.turn = this.turn === 'home' ? 'away' : 'home';
      if (this.turn === RULES.CPU_SIDE) {
        this.flick.enabled = false;
        this.playCpuTurn();
      } else {
        this.flick.enabled = true;
      }
    }
  }
}
