import { DIFFICULTIES } from '@/config/constants';

/**
 * Seletor de nível de dificuldade (DOM overlay, canto superior esquerdo,
 * logo abaixo do rótulo do time do jogador). Muda a IA e o goleiro na hora.
 */
export class DifficultyPicker {
  private root: HTMLLabelElement;

  constructor(
    initialId: string,
    private onChange: (id: string) => void,
  ) {
    this.root = document.createElement('label');
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '44px',
      left: '10px',
      zIndex: '11',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(0,0,0,0.45)',
      padding: '2px 6px',
      borderRadius: '6px',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
    });

    const label = document.createElement('span');
    label.textContent = 'Nível';
    label.style.opacity = '0.75';

    const select = document.createElement('select');
    Object.assign(select.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '4px',
      padding: '1px 3px',
      fontSize: '11px',
    });
    for (const d of DIFFICULTIES) {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.label;
      if (d.id === initialId) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => this.onChange(select.value));

    this.root.append(label, select);
    document.body.appendChild(this.root);
  }

  destroy(): void {
    this.root.remove();
  }
}
