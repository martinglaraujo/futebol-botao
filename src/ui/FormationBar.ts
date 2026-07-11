import { FORMATIONS, DEFAULT_FORMATION_ID } from '@/data/formations';
import type { TeamSide } from '@/config/constants';

/**
 * Barra de seleção de ESQUEMA TÁTICO (DOM overlay sobre o canvas).
 * Um dropdown por time. Ao trocar, dispara onChange(side, formationId),
 * que faz a MatchScene re-montar os titulares e o banco.
 */
export class FormationBar {
  private root: HTMLDivElement;

  constructor(
    homeName: string,
    awayName: string,
    private onChange: (side: TeamSide, formationId: string) => void,
  ) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 10px',
      gap: '8px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#fff',
      pointerEvents: 'none', // só os selects capturam toque
      zIndex: '10',
    });

    this.root.appendChild(this.buildSelect(homeName, 'home'));
    this.root.appendChild(this.buildSelect(awayName, 'away'));
    document.body.appendChild(this.root);
  }

  private buildSelect(teamName: string, side: TeamSide): HTMLElement {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(0,0,0,0.45)',
      padding: '4px 8px',
      borderRadius: '8px',
      pointerEvents: 'auto',
      backdropFilter: 'blur(2px)',
    });

    const label = document.createElement('span');
    label.textContent = teamName;
    label.style.fontWeight = '700';

    const select = document.createElement('select');
    Object.assign(select.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      padding: '3px 6px',
      fontSize: '13px',
    });
    for (const f of FORMATIONS) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      if (f.id === DEFAULT_FORMATION_ID) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => this.onChange(side, select.value));

    wrap.appendChild(label);
    wrap.appendChild(select);
    return wrap;
  }

  destroy(): void {
    this.root.remove();
  }
}
