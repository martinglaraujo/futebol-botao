import { FORMATIONS, DEFAULT_FORMATION_ID } from '@/data/formations';
import { RULES, type TeamSide } from '@/config/constants';

/**
 * Barra de seleção de ESQUEMA TÁTICO (DOM overlay sobre o canvas).
 * Só o lado humano (não-RULES.CPU_SIDE) recebe um dropdown editável — o
 * esquema do adversário é decisão da IA, não do jogador, e aparece como
 * texto fixo. Ao trocar, dispara onChange(side, formationId), que faz a
 * MatchScene re-montar os titulares e o banco.
 */
export class FormationBar {
  private root: HTMLDivElement;
  private cpuFormationEl: HTMLSpanElement | null = null;

  constructor(
    homeName: string,
    awayName: string,
    initialCpuFormationId: string,
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

    this.root.appendChild(this.buildEntry(homeName, 'home', initialCpuFormationId));
    this.root.appendChild(this.buildEntry(awayName, 'away', initialCpuFormationId));
    document.body.appendChild(this.root);
  }

  private buildEntry(teamName: string, side: TeamSide, cpuFormationId: string): HTMLElement {
    return side === RULES.CPU_SIDE ? this.buildReadOnly(teamName, cpuFormationId) : this.buildSelect(teamName, side);
  }

  /**
   * Lado da CPU: mostra o esquema atual sem permitir edição pelo jogador —
   * a IA escolhe sozinha (ver MatchScene.chooseAiFormation), atualizado
   * via updateCpuFormation() a cada tempo.
   */
  private buildReadOnly(teamName: string, formationId: string): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(0,0,0,0.45)',
      padding: '4px 8px',
      borderRadius: '8px',
      backdropFilter: 'blur(2px)',
    });

    const label = document.createElement('span');
    label.textContent = teamName;
    label.style.fontWeight = '700';

    const formation = document.createElement('span');
    formation.textContent = FORMATIONS.find((f) => f.id === formationId)?.name ?? '';
    formation.style.opacity = '0.75';
    this.cpuFormationEl = formation;

    wrap.append(label, formation);
    return wrap;
  }

  /** Atualiza o texto do esquema da CPU (chamado quando ela troca de esquema, ex. no intervalo). */
  updateCpuFormation(formationId: string): void {
    if (this.cpuFormationEl) this.cpuFormationEl.textContent = FORMATIONS.find((f) => f.id === formationId)?.name ?? '';
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
