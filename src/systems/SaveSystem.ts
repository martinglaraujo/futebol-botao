import { GameSave, SCHEMA_VERSION, createEmptySave } from '@/models';

/**
 * Persistência local do "Modo Criar".
 * - Fonte primária: localStorage (síncrono, simples).
 * - Export/Import: arquivo .json (backup e compartilhar entre dispositivos).
 *
 * Blobs pesados (imagens/áudio) idealmente vão para IndexedDB e são
 * referenciados por AssetRef 'blob-id:...'. Aqui guardamos só o JSON de metadados.
 */
const STORAGE_KEY = 'botaofc.save.v1';

export class SaveSystem {
  static load(): GameSave {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySave();
    try {
      const parsed = JSON.parse(raw) as GameSave;
      return SaveSystem.migrate(parsed);
    } catch (err) {
      console.error('[SaveSystem] Save corrompido, iniciando vazio.', err);
      return createEmptySave();
    }
  }

  static save(data: GameSave): void {
    const next: GameSave = { ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  /** Migração entre versões de schema (placeholder para o futuro). */
  private static migrate(data: GameSave): GameSave {
    if (data.schemaVersion === SCHEMA_VERSION) return data;
    // Exemplo futuro: if (data.schemaVersion === 0) { ...adapta... }
    return { ...data, schemaVersion: SCHEMA_VERSION };
  }

  /** Dispara download de um .json com todo o conteúdo criado. */
  static exportToFile(data: GameSave): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `botaofc-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Lê um arquivo .json importado pelo usuário. */
  static async importFromFile(file: File): Promise<GameSave> {
    const text = await file.text();
    const parsed = JSON.parse(text) as GameSave;
    return SaveSystem.migrate(parsed);
  }
}
