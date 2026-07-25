/**
 * Barra discreta de código manual (canto inferior direito, quase
 * invisível). Se o código digitado bater, dispara onMatch() — usado como
 * resgate manual pra recolocar a bola no meio-campo caso a detecção
 * automática de lateral/escanteio falhe em algum caso de borda.
 */
export class CodeBar {
  private root: HTMLDivElement;
  private input: HTMLInputElement;

  constructor(
    private code: string,
    private onMatch: () => void,
  ) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      bottom: '6px',
      right: '6px',
      zIndex: '10',
      opacity: '0.35',
    });

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'código';
    this.input.maxLength = this.code.length;
    Object.assign(this.input.style, {
      width: '70px',
      fontSize: '11px',
      padding: '2px 5px',
      borderRadius: '4px',
      border: '1px solid rgba(255,255,255,0.3)',
      background: 'rgba(0,0,0,0.4)',
      color: '#fff',
    });
    this.input.addEventListener('input', () => {
      if (this.input.value === this.code) {
        this.onMatch();
        this.input.value = '';
        this.input.blur();
      }
    });

    this.root.appendChild(this.input);
    document.body.appendChild(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}
