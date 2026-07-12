import type { Player } from '@/models';

/**
 * Botão "Substituir" (DOM overlay) — abre um painel com dois selects:
 * quem sai (titulares) e quem entra (banco). Só existe pro lado humano;
 * a troca de fato acontece via MatchScene.substitutePlayer().
 */
export class SubstitutionPanel {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private outSelect: HTMLSelectElement;
  private inSelect: HTMLSelectElement;
  private open = false;

  constructor(private onSubstitute: (outId: string, inId: string) => void) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '40px',
      left: '10px',
      zIndex: '11',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Substituir';
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
      background: 'rgba(0,0,0,0.8)',
      borderRadius: '8px',
      padding: '8px',
      flexDirection: 'column',
      gap: '6px',
      color: '#fff',
      minWidth: '190px',
      backdropFilter: 'blur(2px)',
    });

    const outLabel = document.createElement('span');
    outLabel.textContent = 'Sai';
    outLabel.style.opacity = '0.75';
    this.outSelect = this.buildSelect();

    const inLabel = document.createElement('span');
    inLabel.textContent = 'Entra';
    inLabel.style.opacity = '0.75';
    this.inSelect = this.buildSelect();

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Trocar';
    Object.assign(confirmBtn.style, {
      background: '#0f7a34',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px',
      padding: '4px 8px',
      cursor: 'pointer',
      fontWeight: '700',
    });
    confirmBtn.addEventListener('click', () => {
      if (!this.outSelect.value || !this.inSelect.value) return;
      this.onSubstitute(this.outSelect.value, this.inSelect.value);
      this.hidePanel();
    });

    this.panel.append(outLabel, this.outSelect, inLabel, this.inSelect, confirmBtn);
    this.root.append(toggleBtn, this.panel);
    document.body.appendChild(this.root);
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

  /** Atualiza as opções com os titulares (sai) e reservas (entra) atuais. */
  update(starters: Player[], bench: Player[]): void {
    this.fillOptions(this.outSelect, starters);
    this.fillOptions(this.inSelect, bench);
  }

  private fillOptions(select: HTMLSelectElement, players: Player[]): void {
    const prevValue = select.value;
    select.innerHTML = '';
    for (const p of players) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `#${p.number} ${p.name} (${p.position})`;
      select.appendChild(opt);
    }
    if (players.some((p) => p.id === prevValue)) select.value = prevValue;
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
