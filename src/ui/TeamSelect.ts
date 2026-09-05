import { SEED_LIST } from '@/data/seedTeams';

/**
 * Tela "Escolha os times" (DOM) + botão "Escolher times" no HUD. Só dá pra
 * escolher antes da partida começar: o MatchScene esconde o botão no
 * primeiro peteleco.
 */
export class TeamSelect {
  private button: HTMLButtonElement;
  private overlay: HTMLDivElement;

  constructor(
    private onOpen: () => void,
    private onStart: (home: number, away: number) => void,
    private onCancel: () => void,
  ) {
    this.button = document.createElement('button');
    this.button.textContent = 'Escolher times';
    Object.assign(this.button.style, {
      position: 'fixed',
      top: '70px',
      right: '10px',
      zIndex: '11',
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '5px',
      padding: '2px 6px',
      fontSize: '11px',
      cursor: 'pointer',
    });
    this.button.addEventListener('click', () => this.onOpen());
    document.body.appendChild(this.button);

    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.8)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '20',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    });
    document.body.appendChild(this.overlay);
  }

  setButtonVisible(visible: boolean): void {
    this.button.style.display = visible ? 'block' : 'none';
  }

  open(homeIndex: number, awayIndex: number, canCancel: boolean): void {
    this.overlay.innerHTML = '';
    const card = document.createElement('div');
    Object.assign(card.style, {
      width: 'min(380px, 92vw)',
      padding: '20px 24px',
      background: 'rgba(15,40,20,0.96)',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    });

    const title = document.createElement('div');
    title.textContent = 'Escolha os times';
    Object.assign(title.style, { fontSize: '22px', fontWeight: '800', textAlign: 'center' });
    card.appendChild(title);

    const home = this.select(homeIndex);
    const away = this.select(awayIndex);
    // Um time não pode jogar contra ele mesmo: bloqueia na outra lista o já escolhido.
    const sync = () => {
      for (const o of Array.from(home.options)) o.disabled = o.value === away.value;
      for (const o of Array.from(away.options)) o.disabled = o.value === home.value;
    };
    home.addEventListener('change', sync);
    away.addEventListener('change', sync);
    sync();

    card.append(this.field('Seu time', home), this.field('Adversário', away));

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '6px' });
    actions.appendChild(this.actionButton('Começar', true, () => this.onStart(Number(home.value), Number(away.value))));
    if (canCancel) actions.appendChild(this.actionButton('Cancelar', false, () => this.onCancel()));
    card.appendChild(actions);

    this.overlay.appendChild(card);
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
  }

  private field(label: string, control: HTMLElement): HTMLDivElement {
    const r = document.createElement('div');
    Object.assign(r.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '14px' });
    const l = document.createElement('span');
    l.textContent = label;
    r.append(l, control);
    return r;
  }

  private select(value: number): HTMLSelectElement {
    const s = document.createElement('select');
    Object.assign(s.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      padding: '5px 8px',
      fontSize: '14px',
      minWidth: '170px',
    });
    SEED_LIST.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = t.name;
      if (i === value) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  private actionButton(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      background: primary ? '#0f7a34' : 'rgba(255,255,255,0.12)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '8px',
      padding: '8px 18px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
    });
    b.addEventListener('click', onClick);
    return b;
  }

  destroy(): void {
    this.button.remove();
    this.overlay.remove();
  }
}
