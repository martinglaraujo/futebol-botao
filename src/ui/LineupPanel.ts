import type { Player, Position } from '@/models';

export interface LineupSlot {
  role: Position;
  index: number; // ordem dentro do esquema (0-based, pra rótulo tipo "ZAG 2")
}

/**
 * Botão "Escalação" (DOM overlay) — abre um painel com UMA vaga por linha
 * do esquema tático (ex: GOL, ZAG 1, ZAG 2, ZAG 3, ZAG 4, MEI 1...), cada
 * uma com um dropdown listando TODO o elenco disponível. Confirma tudo de
 * uma vez via onApply(playerIdsPorVaga). Só existe pro lado humano.
 */
export class LineupPanel {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private slotsWrap: HTMLDivElement;
  private selects: HTMLSelectElement[] = [];
  private open = false;
  private squad: Player[] = [];

  constructor(private onApply: (playerIds: string[]) => void) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '68px',
      left: '10px',
      zIndex: '11',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Escalação';
    Object.assign(toggleBtn.style, {
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      padding: '4px 8px',
      cursor: 'pointer',
    });
    toggleBtn.addEventListener('click', () => this.togglePanel());

    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      display: 'none',
      marginTop: '4px',
      background: 'rgba(0,0,0,0.85)',
      borderRadius: '8px',
      padding: '8px',
      flexDirection: 'column',
      gap: '4px',
      color: '#fff',
      minWidth: '210px',
      maxHeight: '60vh',
      overflowY: 'auto',
      backdropFilter: 'blur(2px)',
    });

    this.slotsWrap = document.createElement('div');
    Object.assign(this.slotsWrap.style, { display: 'flex', flexDirection: 'column', gap: '4px' });

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirmar escalação';
    Object.assign(confirmBtn.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      padding: '5px 8px',
      cursor: 'pointer',
      fontWeight: '700',
      marginTop: '4px',
    });
    confirmBtn.addEventListener('click', () => this.confirm());

    this.errorEl = document.createElement('div');
    Object.assign(this.errorEl.style, { color: '#ff6b6b', fontSize: '11px', display: 'none' });

    this.panel.append(this.slotsWrap, this.errorEl, confirmBtn);
    this.root.append(toggleBtn, this.panel);
    document.body.appendChild(this.root);
  }

  private errorEl: HTMLDivElement;

  /**
   * Reconstrói as vagas conforme o esquema atual. `slots` vem na mesma
   * ordem usada pra montar o time em campo (formation.lines, linha a
   * linha). `currentIds[i]` é quem ocupa a vaga i agora (ou undefined).
   */
  setSlots(slots: LineupSlot[], currentIds: (string | undefined)[], squad: Player[]): void {
    this.squad = squad;
    this.slotsWrap.innerHTML = '';
    this.selects = [];

    const countByRole = new Map<Position, number>();
    slots.forEach((slot, i) => {
      const n = (countByRole.get(slot.role) ?? 0) + 1;
      countByRole.set(slot.role, n);
      const totalOfRole = slots.filter((s) => s.role === slot.role).length;
      const label = document.createElement('span');
      label.textContent = totalOfRole > 1 ? `${slot.role} ${n}` : slot.role;
      label.style.opacity = '0.75';
      label.style.fontSize = '11px';

      const select = this.buildSelect();
      this.fillOptions(select, squad, currentIds[i]);
      this.selects.push(select);

      this.slotsWrap.append(label, select);
    });
  }

  private buildSelect(): HTMLSelectElement {
    const select = document.createElement('select');
    Object.assign(select.style, {
      width: '100%',
      padding: '3px 4px',
      borderRadius: '4px',
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
    });
    return select;
  }

  private fillOptions(select: HTMLSelectElement, squad: Player[], selectedId?: string): void {
    select.innerHTML = '';
    for (const p of squad) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `#${p.number} ${p.name} (${p.position})`;
      if (p.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    }
  }

  private confirm(): void {
    const ids = this.selects.map((s) => s.value);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      const names = [...new Set(dupes)].map((id) => this.squad.find((p) => p.id === id)?.name ?? id);
      this.errorEl.textContent = `Jogador repetido: ${names.join(', ')}`;
      this.errorEl.style.display = 'block';
      return;
    }
    this.errorEl.style.display = 'none';
    this.onApply(ids);
    this.hidePanel();
  }

  private togglePanel(): void {
    this.open = !this.open;
    this.panel.style.display = this.open ? 'flex' : 'none';
  }

  private hidePanel(): void {
    this.open = false;
    this.panel.style.display = 'none';
  }

  destroy(): void {
    this.root.remove();
  }
}
