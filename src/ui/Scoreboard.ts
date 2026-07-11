/**
 * Placar (DOM overlay sobre o canvas), centralizado no topo — encaixa no
 * vão deixado pela FormationBar (que usa space-between entre os selects).
 */
export class Scoreboard {
  private el: HTMLDivElement;

  constructor(
    private homeShort: string,
    private awayShort: string,
  ) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '6px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      padding: '5px 14px',
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: '10',
      backdropFilter: 'blur(2px)',
    });
    document.body.appendChild(this.el);
    this.update(0, 0);
  }

  update(home: number, away: number): void {
    this.el.textContent = `${this.homeShort} ${home} x ${away} ${this.awayShort}`;
  }

  destroy(): void {
    this.el.remove();
  }
}
