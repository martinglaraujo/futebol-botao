import { SEED_LIST } from '@/data/seedTeams';
import { defaultSettings, type GameSettings } from '@/config/settings';

/**
 * Botão "Personalizar" + tela de personalização (DOM). Três seções: times e
 * cores, campo e bola, regras da partida. "Aplicar e reiniciar" devolve as
 * novas configurações via onApply; o MatchScene salva e reinicia.
 */
export class SettingsPanel {
  private button: HTMLButtonElement;
  private overlay: HTMLDivElement;

  constructor(
    private onOpen: () => void,
    private onApply: (s: GameSettings) => void,
    private onCancel: () => void,
  ) {
    this.button = document.createElement('button');
    this.button.textContent = 'Personalizar';
    Object.assign(this.button.style, {
      position: 'fixed',
      top: '44px',
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
      background: 'rgba(0,0,0,0.78)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '20',
      fontFamily: 'system-ui, sans-serif',
      color: '#fff',
    });
    document.body.appendChild(this.overlay);
  }

  open(current: GameSettings): void {
    this.render(current);
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
  }

  private render(cur: GameSettings): void {
    this.overlay.innerHTML = '';
    const card = document.createElement('div');
    Object.assign(card.style, {
      width: 'min(460px, 92vw)',
      maxHeight: '90vh',
      overflowY: 'auto',
      padding: '18px 22px',
      background: 'rgba(15,40,20,0.96)',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '13px',
    });

    const title = document.createElement('div');
    title.textContent = 'Personalizar';
    Object.assign(title.style, { fontSize: '20px', fontWeight: '800', marginBottom: '4px' });
    card.appendChild(title);

    const homeColor = this.color(cur.homeColor);
    const awayColor = this.color(cur.awayColor);

    const fieldColor = this.color(cur.fieldColor);
    const lineColor = this.color(cur.lineColor);
    const ballColor = this.color(cur.ballColor);
    const halfMinutes = this.number(cur.halfMinutes, 1, 15);
    const maxTouches = this.number(cur.maxTouches, 3, 30);
    const maxSame = this.number(cur.maxSameButton, 1, 10);
    const fouls = document.createElement('input');
    fouls.type = 'checkbox';
    fouls.checked = cur.fouls;

    card.append(
      this.section('Cores dos times'),
      this.row('Cor do seu time', homeColor),
      this.row('Cor do adversário', awayColor),
      this.section('Campo e bola'),
      this.row('Cor do gramado', fieldColor),
      this.row('Cor das linhas', lineColor),
      this.row('Cor da bola', ballColor),
      this.section('Regras da partida'),
      this.row('Minutos por tempo', halfMinutes),
      this.row('Limite de toques na jogada', maxTouches),
      this.row('Toques seguidos com o mesmo botão', maxSame),
      this.row('Faltas e cartões', fouls),
    );

    const collect = (): GameSettings => ({
      ...cur,
      homeColor: homeColor.value,
      awayColor: awayColor.value,
      fieldColor: fieldColor.value,
      lineColor: lineColor.value,
      ballColor: ballColor.value,
      halfMinutes: Number(halfMinutes.value),
      maxTouches: Number(maxTouches.value),
      maxSameButton: Number(maxSame.value),
      fouls: fouls.checked,
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' });
    actions.append(
      this.actionButton('Aplicar e reiniciar', true, () => this.onApply(collect())),
      this.actionButton('Restaurar padrão', false, () => this.render({ ...defaultSettings(), homeTeam: cur.homeTeam, awayTeam: cur.awayTeam, homeColor: SEED_LIST[cur.homeTeam].color, awayColor: SEED_LIST[cur.awayTeam].color })),
      this.actionButton('Cancelar', false, () => this.onCancel()),
    );
    card.appendChild(actions);

    const note = document.createElement('div');
    note.textContent = 'Aplicar reinicia a partida.';
    Object.assign(note.style, { fontSize: '11px', opacity: '0.65' });
    card.appendChild(note);

    this.overlay.appendChild(card);
  }

  private section(text: string): HTMLDivElement {
    const d = document.createElement('div');
    d.textContent = text;
    Object.assign(d.style, {
      fontWeight: '700',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      opacity: '0.7',
      marginTop: '8px',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      paddingBottom: '3px',
    });
    return d;
  }

  private row(label: string, ...controls: HTMLElement[]): HTMLDivElement {
    const r = document.createElement('div');
    Object.assign(r.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });
    const l = document.createElement('span');
    l.textContent = label;
    const box = document.createElement('div');
    Object.assign(box.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    box.append(...controls);
    r.append(l, box);
    return r;
  }

  private color(value: string): HTMLInputElement {
    const i = document.createElement('input');
    i.type = 'color';
    i.value = value;
    Object.assign(i.style, { width: '38px', height: '24px', padding: '0', border: 'none', background: 'none', cursor: 'pointer' });
    return i;
  }

  private number(value: number, min: number, max: number): HTMLInputElement {
    const i = document.createElement('input');
    i.type = 'number';
    i.min = String(min);
    i.max = String(max);
    i.value = String(value);
    Object.assign(i.style, {
      width: '60px',
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '4px',
      padding: '3px 5px',
    });
    return i;
  }

  private actionButton(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      background: primary ? '#0f7a34' : 'rgba(255,255,255,0.12)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '8px',
      padding: '7px 12px',
      fontSize: '13px',
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
