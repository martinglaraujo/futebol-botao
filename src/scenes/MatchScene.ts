import Phaser from 'phaser';
import { GAME, FIELD, PHYSICS, RULES, FOULS, TOUCH_RULES, GOALKEEPER, type TeamSide } from '@/config/constants';
import { ButtonEntity } from '@/entities/ButtonEntity';
import { FlickController } from '@/systems/FlickController';
import { AIController } from '@/systems/AIController';
import { seedTeams } from '@/data/seedTeams';
import { FORMATIONS, getFormation, DEFAULT_FORMATION_ID, type Formation } from '@/data/formations';
import { FormationBar } from '@/ui/FormationBar';
import { Scoreboard } from '@/ui/Scoreboard';
import { SubstitutionPanel } from '@/ui/SubstitutionPanel';
import { CodeBar } from '@/ui/CodeBar';
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
  private subPanel!: SubstitutionPanel;
  private codeBar!: CodeBar;
  /** Reservas atuais por lado (atualizado a cada spawnTeam/substituição). */
  private benchPlayers: Record<TeamSide, Player[]> = { home: [], away: [] };
  /** Último lado a tocar a bola — decide escanteio (defensor) vs. tiro de meta (atacante). */
  private lastToucherSide: TeamSide | null = null;
  private remainingSeconds = RULES.MATCH_MINUTES * 60;
  private matchOver = false;
  private half: 1 | 2 = 1;
  private clockRunning = false;
  private cardBanner!: HTMLDivElement;
  private lastFoulAt = -Infinity;
  // Controle de toques da posse atual (RULES: ver TOUCH_RULES).
  private possessionTouches = 0;
  private sameButtonTouches = 0;
  private lastTouchButtonId: string | null = null;
  private touchedThisFlick = false;
  private touchButtonIdThisFlick: string | null = null;
  /** IDs de jogadores expulsos (vermelho) — ficam fora mesmo após rebuildTeam(). */
  private sentOffIds: Record<TeamSide, Set<string>> = { home: new Set(), away: new Set() };
  /** Amarelos acumulados por jogador — sobrevive ao rebuildTeam() (ButtonEntity é recriado a cada gol). */
  private yellowCounts: Record<TeamSide, Map<string, number>> = { home: new Map(), away: new Map() };

  constructor() {
    super('MatchScene');
  }

  create(): void {
    // A cena é reutilizada pelo scene.restart() (mesma instância) — os
    // campos abaixo têm inicializadores de classe que só rodam uma vez, na
    // primeira construção, então precisam ser resetados aqui manualmente.
    this.resetState();

    const [home, away] = seedTeams();
    this.homeTeam = home;
    this.awayTeam = away;
    // A IA escolhe o próprio esquema tático (o jogador não mexe nele — ver FormationBar).
    this.formationId[RULES.CPU_SIDE] = this.chooseAiFormation();

    this.matter.world.setBounds(0, 0, GAME.WIDTH, GAME.HEIGHT); // fallback
    this.cameras.main.setBackgroundColor(GAME.BG_COLOR);

    // Precisa existir ANTES do primeiro spawnTeam('home'), que já chama
    // refreshSubPanel() pra popular a lista inicial de titulares/banco.
    this.subPanel = new SubstitutionPanel((outId, inId) => this.substitutePlayer(outId, inId));

    this.drawTable();
    this.buildWalls();
    this.buildGoals();
    this.spawnBall();
    this.spawnTeam(home, 'home');
    this.spawnTeam(away, 'away');
    this.trackCollisions();

    // Só o time humano da vez pode ser petelecado (o goleiro é autônomo —
    // ver updateGoalkeepers — e não entra nesse pool); e só quando tudo está parado.
    this.flick = new FlickController(
      this,
      () =>
        this.everythingStopped() && this.turn !== RULES.CPU_SIDE
          ? this.buttons.filter((b) => b.side === this.turn && !b.sentOff && b.player.position !== 'GOL')
          : [],
      () => this.onFlickResolved(),
    );
    this.ai = new AIController(this);

    this.setupZoomControls();

    // Dropdown de esquema tático por time.
    this.formationBar = new FormationBar(home.name, away.name, this.formationId[RULES.CPU_SIDE], (side, id) => {
      this.formationId[side] = id;
      this.rebuildTeam(side);
    });
    this.scoreboard = new Scoreboard(home.shortName, away.shortName, () => this.scene.restart());
    this.scoreboard.updateTime(this.remainingSeconds, this.half);
    this.updateTurnIndicator();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickClock() });
    this.cardBanner = this.buildCardBanner();
    // Resgate manual: código secreto recoloca a bola no meio-campo, caso a
    // detecção automática de lateral/escanteio falhe em algum caso de borda.
    this.codeBar = new CodeBar('44572963', () => this.resetBallToCenter());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.formationBar.destroy();
      this.scoreboard.destroy();
      this.cardBanner.remove();
      this.subPanel.destroy();
      this.codeBar.destroy();
    });
  }

  /** Recoloca só a bola no centro do campo (resgate manual via CodeBar). */
  private resetBallToCenter(): void {
    this.matter.body.setPosition(this.ball, { x: GAME.WIDTH / 2, y: GAME.HEIGHT / 2 });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
    console.log('[CODE] bola reposicionada manualmente pro meio-campo');
  }

  /** Banner transitório de cartão (DOM overlay), começa invisível. */
  private buildCardBanner(): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      top: '46px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '5px 14px',
      borderRadius: '6px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: '700',
      zIndex: '10',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.25s',
    });
    document.body.appendChild(el);
    return el;
  }

  /** Reseta todo o estado mutável — necessário porque scene.restart() reaproveita a instância. */
  private resetState(): void {
    this.buttons = [];
    this.turn = 'home';
    this.detailed = false;
    this.score = { home: 0, away: 0 };
    this.formationId = { home: DEFAULT_FORMATION_ID, away: DEFAULT_FORMATION_ID };
    this.benchGfx = { home: null, away: null };
    this.benchPlayers = { home: [], away: [] };
    this.lastToucherSide = null;
    this.remainingSeconds = RULES.MATCH_MINUTES * 60;
    this.matchOver = false;
    this.half = 1;
    this.clockRunning = false;
    this.lastFoulAt = -Infinity;
    this.sentOffIds = { home: new Set(), away: new Set() };
    this.yellowCounts = { home: new Map(), away: new Map() };
    this.possessionTouches = 0;
    this.sameButtonTouches = 0;
    this.lastTouchButtonId = null;
    this.touchedThisFlick = false;
    this.touchButtonIdThisFlick = null;
    this.awaitingRest = false;
    this.awaitingRestSince = 0;
    this.ballDeadFrames = 0;
  }

  /** Cronômetro regressivo — só corre depois do chute inicial de cada tempo. */
  private tickClock(): void {
    if (this.matchOver || !this.clockRunning) return;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
    this.scoreboard.updateTime(this.remainingSeconds, this.half);
    if (this.remainingSeconds === 0) {
      if (this.half === 1) this.startSecondHalf();
      else this.endMatch();
    }
  }

  /** Fim do 1º tempo: reposiciona os times, zera o relógio pro 2º e pausa até o próximo peteleco. */
  private startSecondHalf(): void {
    this.half = 2;
    this.remainingSeconds = RULES.MATCH_MINUTES * 60;
    this.clockRunning = false;
    // A IA pode trocar de esquema no intervalo, igual um técnico de verdade.
    this.formationId[RULES.CPU_SIDE] = this.chooseAiFormation();
    this.formationBar.updateCpuFormation(this.formationId[RULES.CPU_SIDE]);
    this.resetKickoff();
    this.scoreboard.showHalftime();
  }

  /** Sorteia um esquema tático pra IA usar (ela decide sozinha, sem o jogador poder mexer). */
  private chooseAiFormation(): string {
    const pick = Phaser.Utils.Array.GetRandom(FORMATIONS);
    return pick.id;
  }

  private endMatch(): void {
    this.matchOver = true;
    this.flick.enabled = false;
    this.scoreboard.showFullTime();
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

  /**
   * Registra qual lado tocou a bola por último (decide escanteio vs. tiro de
   * meta) e detecta faltas: choque forte entre botões de times diferentes.
   */
  private trackCollisions(): void {
    this.matter.world.on('collisionstart', (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA as MatterJS.BodyType;
        const bodyB = pair.bodyB as MatterJS.BodyType;
        this.trackBallTouch(bodyA, bodyB);
        this.checkFoul(bodyA, bodyB);
      }
    });
  }

  private trackBallTouch(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    const other = bodyA.label === 'ball' ? bodyB : bodyB.label === 'ball' ? bodyA : null;
    if (!other || !other.label.startsWith('button:')) return;
    const [, side, playerId] = other.label.split(':');
    this.lastToucherSide = side as TeamSide;
    // Só conta pro controle de toques se foi o TIME DA POSSE quem tocou.
    if (side === this.turn) {
      this.touchedThisFlick = true;
      this.touchButtonIdThisFlick = playerId;
    }
  }

  /**
   * Falta automática: colisão entre botões de TIMES DIFERENTES com
   * velocidade relativa acima do limiar — só a pancada forte e direta
   * conta. O botão mais rápido dos dois é o "culpado" (foi ele quem
   * acabou de ser petelecado contra o outro).
   */
  private checkFoul(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    if (!bodyA.label.startsWith('button:') || !bodyB.label.startsWith('button:')) return;
    const btnA = this.buttons.find((b) => b.body === bodyA);
    const btnB = this.buttons.find((b) => b.body === bodyB);
    if (!btnA || !btnB || btnA.side === btnB.side || btnA.sentOff || btnB.sentOff) return;

    const relSpeed = Math.hypot(bodyA.velocity.x - bodyB.velocity.x, bodyA.velocity.y - bodyB.velocity.y);
    if (relSpeed < FOULS.IMPACT_SPEED_THRESHOLD) return;

    if (this.time.now - this.lastFoulAt < FOULS.REPEAT_COOLDOWN_MS) return; // mesma pancada, não conta 2x
    this.lastFoulAt = this.time.now;

    const offender = btnA.speed >= btnB.speed ? btnA : btnB;
    this.callFoul(offender);
  }

  private callFoul(offender: ButtonEntity): void {
    const count = (this.yellowCounts[offender.side].get(offender.player.id) ?? 0) + 1;
    this.yellowCounts[offender.side].set(offender.player.id, count);
    offender.setYellowCards(count);
    const sendOff = count >= RULES.YELLOW_BEFORE_RED;
    this.showCardBanner(offender, sendOff ? 'red' : 'yellow');
    this.cameras.main.flash(200, 255, sendOff ? 40 : 210, 0);
    if (sendOff) {
      this.sentOffIds[offender.side].add(offender.player.id);
      offender.destroy();
      if (offender.side === 'home') this.refreshSubPanel();
    }
    console.log(
      `[FALTA] ${offender.side} #${offender.player.number} ${offender.player.name} — ${sendOff ? 'VERMELHO (expulso)' : 'amarelo'}`,
    );
  }

  private showCardBanner(offender: ButtonEntity, kind: 'yellow' | 'red'): void {
    this.cardBanner.style.background = kind === 'yellow' ? '#f4d03f' : '#e74c3c';
    this.cardBanner.style.color = kind === 'yellow' ? '#111' : '#fff';
    const label = kind === 'yellow' ? 'CARTÃO AMARELO' : 'CARTÃO VERMELHO — EXPULSO';
    this.cardBanner.textContent = `${label}: ${offender.player.name}`;
    this.cardBanner.style.opacity = '1';
    this.time.delayedCall(2200, () => {
      this.cardBanner.style.opacity = '0';
    });
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
    const available = team.squad.filter((p) => !this.sentOffIds[side].has(p.id));
    const { starters: allStarters, bench: allBench } = this.allocate(available, formation);

    // Expulsão não é reposta: o time joga com um a menos pro resto da
    // partida, então cortamos o fim da lista de titulares em vez de deixar
    // o banco preencher a vaga do jogador expulso.
    const maxStarters = RULES.PLAYERS_PER_TEAM - this.sentOffIds[side].size;
    const starters = allStarters.slice(0, maxStarters);
    const bench = [...allBench, ...allStarters.slice(maxStarters).map((s) => s.player)];

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
        const entry = starters[cursor++];
        if (!entry) continue; // vaga sem titular (time jogando com expulsão)
        const { player } = entry;
        const y = fieldTop + (span * (i + 1)) / (line.count + 1);
        const button = new ButtonEntity(this, x, y, side, player, buttonColor);
        button.setYellowCards(this.yellowCounts[side].get(player.id) ?? 0);
        this.buttons.push(button);
      }
    });

    this.benchPlayers[side] = bench;
    this.drawBench(side, bench, buttonColor);
    if (side === 'home') this.refreshSubPanel();
  }

  /** Atualiza o painel de substituição com os titulares/reservas atuais do home. */
  private refreshSubPanel(): void {
    const starters = this.buttons.filter((b) => b.side === 'home' && !b.sentOff).map((b) => b.player);
    this.subPanel.update(starters, this.benchPlayers.home);
  }

  /** Troca um titular do home por um reserva, na mesma posição em campo. */
  private substitutePlayer(outId: string, inId: string): void {
    if (!this.everythingStopped()) {
      console.log('[SUB] jogo ainda em movimento, tenta de novo quando parar');
      return;
    }
    const outButton = this.buttons.find((b) => b.side === 'home' && b.player.id === outId && !b.sentOff);
    const inPlayer = this.benchPlayers.home.find((p) => p.id === inId);
    if (!outButton || !inPlayer) return;

    const { x, y } = outButton.body.position;
    const buttonColor = Phaser.Display.Color.HexStringToColor(this.homeTeam.kits[0].buttonColor).color;
    const outPlayer = outButton.player;

    this.buttons = this.buttons.filter((b) => b !== outButton);
    outButton.destroy();

    const newButton = new ButtonEntity(this, x, y, 'home', inPlayer, buttonColor);
    newButton.setYellowCards(this.yellowCounts.home.get(inPlayer.id) ?? 0);
    this.buttons.push(newButton);

    this.benchPlayers.home = this.benchPlayers.home.filter((p) => p.id !== inId);
    this.benchPlayers.home.push(outPlayer);

    this.drawBench('home', this.benchPlayers.home, buttonColor);
    this.refreshSubPanel();
    console.log(`[SUB] ${outPlayer.name} sai, ${inPlayer.name} entra`);
  }

  /**
   * Desenha o banco de reservas na margem inferior, sem física. Cada time
   * fica no seu próprio lado do campo (home à esquerda, away à direita) —
   * assim o topo inteiro sobra livre para o Scoreboard e a FormationBar.
   */
  private drawBench(side: TeamSide, bench: Player[], buttonColor: number): void {
    this.benchGfx[side]?.destroy();
    const y = GAME.HEIGHT - 26;
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
    // O goleiro (GOL) fica se autoajustando por conta própria o tempo todo
    // (updateGoalkeepers) — se entrasse nessa checagem, um micro-tremor dele
    // bastaria pra travar o próximo peteleco pra sempre (getFlickable()
    // também usa este método). Ele não faz parte da "jogada resolvida".
    return this.buttons.every((b) => b.sentOff || b.player.position === 'GOL' || b.speed <= PHYSICS.REST_SPEED_THRESHOLD);
  }

  private onFlickResolved(): void {
    // O relógio só começa a correr no primeiro peteleco de cada tempo (o
    // chute inicial) — antes disso fica parado em 05:00.
    if (!this.clockRunning) {
      this.clockRunning = true;
      this.scoreboard.updateTime(this.remainingSeconds, this.half);
    }
    // Reseta o registro de toque deste peteleco — trackBallTouch() marca
    // se algum botão do time da posse encostou na bola durante o assentamento.
    this.touchedThisFlick = false;
    this.touchButtonIdThisFlick = null;
    // A posse é resolvida assim que o movimento cessar (checado no update()).
    this.awaitingRest = true;
    this.awaitingRestSince = this.time.now;
    this.flick.enabled = false;
  }

  /** Zera velocidades de bola e botões — usado pela trava de SETTLE_TIMEOUT_MS. */
  private forceStopAll(): void {
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    for (const b of this.buttons) {
      this.matter.body.setVelocity(b.body, { x: 0, y: 0 });
      this.matter.body.setAngularVelocity(b.body, 0);
    }
  }

  /** Centro do gol adversário do lado informado (para onde a IA mira). */
  private opponentGoalOf(side: TeamSide): { x: number; y: number } {
    const x = side === 'home' ? GAME.WIDTH - FIELD.MARGIN : FIELD.MARGIN;
    return { x, y: GAME.HEIGHT / 2 };
  }

  private playCpuTurn(): void {
    const strikers = this.buttons.filter((b) => b.side === this.turn && !b.sentOff && b.player.position !== 'GOL');
    this.ai.playTurn(strikers, this.ball, this.opponentGoalOf(this.turn), () => this.onFlickResolved());
  }

  /**
   * Goleiro autônomo: acompanha a bola lateralmente dentro do gol quando
   * ela entra na zona de reação do próprio lado; senão volta pro centro.
   * Controlado por velocidade (não por teleporte) pra continuar colidindo
   * com a bola normalmente e pra não confundir everythingStopped().
   */
  private updateGoalkeepers(): void {
    for (const side of ['home', 'away'] as const) {
      const gk = this.buttons.find((b) => b.side === side && b.player.position === 'GOL' && !b.sentOff);
      if (!gk) continue;

      const cy = GAME.HEIGHT / 2;
      const fieldSpan = GAME.WIDTH - FIELD.MARGIN * 2;
      const reactDepth = fieldSpan * GOALKEEPER.REACT_ZONE_FRAC;
      const inZone =
        side === 'home'
          ? this.ball.position.x <= FIELD.MARGIN + reactDepth
          : this.ball.position.x >= GAME.WIDTH - FIELD.MARGIN - reactDepth;

      const halfGoal = FIELD.GOAL_WIDTH / 2 - PHYSICS.BUTTON_RADIUS - 4;
      const targetY = inZone ? Phaser.Math.Clamp(this.ball.position.y, cy - halfGoal, cy + halfGoal) : cy;

      const diff = targetY - gk.body.position.y;
      if (Math.abs(diff) < GOALKEEPER.DEADBAND) {
        this.matter.body.setVelocity(gk.body, { x: gk.body.velocity.x, y: 0 });
      } else {
        const vy = Phaser.Math.Clamp(diff * 0.15, -GOALKEEPER.MAX_SPEED, GOALKEEPER.MAX_SPEED);
        this.matter.body.setVelocity(gk.body, { x: gk.body.velocity.x, y: vy });
      }
    }
  }

  private awaitingRest = false;
  private awaitingRestSince = 0;

  /**
   * Detecção de gol/saída POR POSIÇÃO (chamado todo frame).
   * - Cruzou a linha de fundo dentro das traves  → GOL.
   * - Cruzou a linha de fundo fora das traves     → escanteio (defensor tocou
   *   por último) ou tiro de meta (atacante tocou por último).
   * - Cruzou a lateral (topo/base do campo)       → FORA, tiro de lateral.
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
    const topLine = FIELD.MARGIN;
    const bottomLine = GAME.HEIGHT - FIELD.MARGIN;

    // Gol: só dentro da faixa da trave.
    if (inGoalBand && x <= leftLine) return this.onGoal('away'); // gol contra o mandante
    if (inGoalBand && x >= rightLine) return this.onGoal('home');

    // Saiu pela linha de fundo fora da faixa da trave → escanteio/tiro de meta.
    // (Checado ANTES da lateral pra não perder o caso de saída bem no canto.)
    if (!inGoalBand && x <= leftLine + PHYSICS.BALL_RADIUS) return this.deadBallOnGoalLine('home', y);
    if (!inGoalBand && x >= rightLine - PHYSICS.BALL_RADIUS) return this.deadBallOnGoalLine('away', y);

    // FORA pela lateral (topo/base) → tiro de lateral no ponto onde saiu.
    if (y <= topLine + PHYSICS.BALL_RADIUS) return this.throwInSide(x, topLine + PHYSICS.BALL_RADIUS + 2);
    if (y >= bottomLine - PHYSICS.BALL_RADIUS) return this.throwInSide(x, bottomLine - PHYSICS.BALL_RADIUS - 2);
  }

  /**
   * Bola saiu pela linha de fundo sem ser gol.
   * - Último toque foi do time que defende essa linha → ESCANTEIO (a bola
   *   voltou pra ele mesmo, então foi ele quem mandou pra fora): pro atacante,
   *   no canto mais próximo de onde saiu.
   * - Último toque foi do atacante (chute foi longe/pra fora) → TIRO DE META:
   *   devolve pro defensor, perto do próprio gol.
   */
  private deadBallOnGoalLine(defendingSide: TeamSide, y: number): void {
    const isLeft = defendingSide === 'home';
    const goalLineX = isLeft ? FIELD.MARGIN : GAME.WIDTH - FIELD.MARGIN;
    const inward = isLeft ? 1 : -1;
    const cy = GAME.HEIGHT / 2;

    let pos: { x: number; y: number };
    if (this.lastToucherSide === defendingSide) {
      const cornerY = y < cy ? FIELD.MARGIN + 14 : GAME.HEIGHT - FIELD.MARGIN - 14;
      pos = { x: goalLineX + inward * 14, y: cornerY }; // escanteio
    } else {
      pos = { x: goalLineX + inward * 70, y: cy }; // tiro de meta
    }

    this.matter.body.setPosition(this.ball, pos);
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
    this.resetPossessionTouches(); // bola saiu de jogo — reinicia a contagem de toques
  }

  /** FORA: bola saiu pela lateral (topo/base) — reposiciona no ponto de saída (tiro de lateral). */
  private throwInSide(x: number, y: number): void {
    const clampedX = Phaser.Math.Clamp(x, FIELD.MARGIN + 20, GAME.WIDTH - FIELD.MARGIN - 20);
    this.matter.body.setPosition(this.ball, { x: clampedX, y });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
    this.resetPossessionTouches();
  }

  private resetPossessionTouches(): void {
    this.possessionTouches = 0;
    this.sameButtonTouches = 0;
    this.lastTouchButtonId = null;
  }

  private ballDeadFrames = 0;

  private onGoal(scorer: TeamSide): void {
    this.score[scorer] += 1;
    this.scoreboard.updateScore(this.score.home, this.score.away);
    // TODO: zoom-in de comemoração + hino.
    this.cameras.main.flash(300, 255, 255, 255);
    this.resetKickoff();
    console.log(`[GOL] ${this.homeTeam.shortName} ${this.score.home} x ${this.score.away} ${this.awayTeam.shortName}`);
  }

  /** Devolve bola E botões às posições de chute inicial (formação atual). */
  private resetKickoff(): void {
    this.rebuildTeam('home');
    this.rebuildTeam('away');
    this.matter.body.setPosition(this.ball, { x: GAME.WIDTH / 2, y: GAME.HEIGHT / 2 });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    this.ballDeadFrames = 6;
    this.lastToucherSide = null;
    this.resetPossessionTouches();
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

    if (this.matchOver) return;

    this.updateGoalkeepers();

    // Fim do movimento → resolve a posse (continua ou passa a vez) e
    // reabilita o peteleco. Se a física nunca convergir (oscilação
    // residual), a trava de tempo força a parada.
    const settledByTimeout = this.time.now - this.awaitingRestSince > PHYSICS.SETTLE_TIMEOUT_MS;
    if (this.awaitingRest && (this.everythingStopped() || settledByTimeout)) {
      if (settledByTimeout) this.forceStopAll();
      this.awaitingRest = false;
      this.resolvePossession();
    }
  }

  /**
   * Decide se o time da vez mantém a posse (continuou tocando a bola,
   * dentro dos limites de TOUCH_RULES) ou se ela passa pro adversário.
   */
  private resolvePossession(): void {
    if (!this.keepsPossession()) {
      this.turn = this.turn === 'home' ? 'away' : 'home';
      this.resetPossessionTouches();
    }
    if (this.turn === RULES.CPU_SIDE) {
      this.flick.enabled = false;
      this.playCpuTurn();
    } else {
      this.flick.enabled = true;
    }
    this.updateTurnIndicator();
  }

  /**
   * Deixa explícito de quem é a vez — sem isso, quando o jogador mantém a
   * posse (toque seguido), a tela não muda em nada e parece que travou.
   */
  private updateTurnIndicator(): void {
    if (this.turn === RULES.CPU_SIDE) {
      const cpuTeam = RULES.CPU_SIDE === 'home' ? this.homeTeam : this.awayTeam;
      this.scoreboard.updateTurn(`Vez d${cpuTeam.article === 'a' ? 'a' : 'o'} ${cpuTeam.name}...`);
    } else if (this.possessionTouches > 0) {
      this.scoreboard.updateTurn(`Sua vez — toque de novo (${this.possessionTouches}/${TOUCH_RULES.MAX_TOTAL})`);
    } else {
      this.scoreboard.updateTurn('Sua vez');
    }
  }

  /** Atualiza os contadores de toque deste peteleco e devolve se o time pode continuar. */
  private keepsPossession(): boolean {
    if (!this.touchedThisFlick) {
      console.log(`[TOQUES] ${this.turn} perdeu a posse — não tocou na bola`);
      return false;
    }

    if (this.touchButtonIdThisFlick === this.lastTouchButtonId) {
      this.sameButtonTouches += 1;
    } else {
      this.sameButtonTouches = 1;
      this.lastTouchButtonId = this.touchButtonIdThisFlick;
    }
    this.possessionTouches += 1;

    if (this.sameButtonTouches > TOUCH_RULES.MAX_SAME_BUTTON) {
      console.log(`[TOQUES] ${this.turn} perdeu a posse — ${this.sameButtonTouches} toques seguidos com o mesmo botão`);
      return false;
    }
    if (this.possessionTouches >= TOUCH_RULES.MAX_TOTAL) {
      console.log(`[TOQUES] ${this.turn} perdeu a posse — limite de ${TOUCH_RULES.MAX_TOTAL} toques na jogada`);
      return false;
    }
    return true;
  }
}
