/**
 * HUD (DOM overlay sobre o canvas): placar + tempo + reiniciar, centralizado
 * no topo — encaixa no vão deixado pela FormationBar (space-between).
 */
export class Scoreboard {
  private root: HTMLDivElement;
  private scoreEl: HTMLSpanElement;
  private timeEl: HTMLSpanElement;
  private turnEl: HTMLDivElement;

  constructor(
    private homeShort: string,
    private awayShort: string,
    onRestart: () => void,
  ) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '6px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      padding: '5px 8px 5px 14px',
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: '10',
      backdropFilter: 'blur(2px)',
    });

    this.scoreEl = document.createElement('span');
    this.timeEl = document.createElement('span');
    Object.assign(this.timeEl.style, { opacity: '0.85', fontVariantNumeric: 'tabular-nums' });

    const restartBtn = document.createElement('button');
    restartBtn.textContent = '⟲';
    restartBtn.title = 'Reiniciar partida';
    Object.assign(restartBtn.style, {
      pointerEvents: 'auto',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.15)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      fontSize: '14px',
      lineHeight: '1',
      padding: '4px 8px',
    });
    restartBtn.addEventListener('click', onRestart);

    this.root.append(this.scoreEl, this.timeEl, restartBtn);
    document.body.appendChild(this.root);

    // Linha extra logo abaixo — deixa explícito de quem é a vez, pra não
    // parecer que travou quando o jogador mantém a posse (toque seguido).
    this.turnEl = document.createElement('div');
    Object.assign(this.turnEl.style, {
      position: 'fixed',
      top: '36px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '12px',
      fontWeight: '600',
      color: '#ffe28a',
      background: 'rgba(0,0,0,0.4)',
      padding: '2px 10px',
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: '10',
      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    });
    document.body.appendChild(this.turnEl);

    this.updateScore(0, 0);
    this.updateTime(0, 1);
  }

  updateTurn(text: string): void {
    this.turnEl.textContent = text;
  }

  updateScore(home: number, away: number): void {
    this.scoreEl.textContent = `${this.homeShort} ${home} x ${away} ${this.awayShort}`;
  }

  updateTime(remainingSeconds: number, half: 1 | 2): void {
    const m = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(remainingSeconds % 60).toString().padStart(2, '0');
    this.timeEl.textContent = `${half}ºT ${m}:${s}`;
  }

  showHalftime(): void {
    this.timeEl.textContent = 'INTERVALO';
  }

  showFullTime(): void {
    this.timeEl.textContent = 'FIM DE JOGO';
  }

  destroy(): void {
    this.root.remove();
    this.turnEl.remove();
  }
}
