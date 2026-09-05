export interface MenuOption {
  label: string;
  onClick: () => void;
}

/**
 * Tela de menu (DOM overlay) que escurece o jogo — usada no fim do 1º tempo
 * e no fim de jogo. Fica ABAIXO do HUD (z-index menor), então placar,
 * escalação e substituição continuam visíveis e clicáveis.
 */
export class MatchMenu {
  private root: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.72)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    });
    document.body.appendChild(this.root);
  }

  /** Mostra um cartão central com título, subtítulo opcional e botões empilhados. */
  show(title: string, subtitle: string, options: MenuOption[]): void {
    this.root.innerHTML = '';
    this.root.style.alignItems = 'center';

    const card = document.createElement('div');
    Object.assign(card.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: '260px',
      padding: '22px 26px',
      background: 'rgba(15,40,20,0.92)',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: '12px',
      textAlign: 'center',
    });

    const h = document.createElement('div');
    h.textContent = title;
    Object.assign(h.style, { fontSize: '22px', fontWeight: '800' });
    card.appendChild(h);

    if (subtitle) {
      const sub = document.createElement('div');
      sub.textContent = subtitle;
      Object.assign(sub.style, { fontSize: '16px', opacity: '0.85', marginBottom: '6px' });
      card.appendChild(sub);
    }

    for (const opt of options) card.appendChild(this.button(opt));
    this.root.appendChild(card);
    this.root.style.display = 'flex';
  }

  /** Só um botão embaixo, com o jogo escurecido (usado durante o gerenciamento de time). */
  showBottomButton(option: MenuOption): void {
    this.root.innerHTML = '';
    this.root.style.alignItems = 'flex-end';
    const wrap = document.createElement('div');
    wrap.style.paddingBottom = '46px';
    wrap.appendChild(this.button(option));
    this.root.appendChild(wrap);
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
    this.root.innerHTML = '';
  }

  private button(opt: MenuOption): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = opt.label;
    Object.assign(b.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.45)',
      borderRadius: '8px',
      padding: '9px 16px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
    });
    b.addEventListener('click', opt.onClick);
    return b;
  }

  destroy(): void {
    this.root.remove();
  }
}
