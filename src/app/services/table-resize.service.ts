// table-resize.service.ts
import { Injectable } from '@angular/core';
import { ResizeTableDirective } from '../directives/resize-table.directive';

@Injectable({
  providedIn: 'root',
})
export class TableResizeService {
  private tables = new Map<string, ResizeTableDirective>();

  registerTable(id: string, directive: ResizeTableDirective): void {
    this.tables.set(id, directive);
  }

  unregisterTable(id: string): void {
    this.tables.delete(id);
  }

  recalculateTable(id: string): void {
    const directive = this.tables.get(id);
    if (directive) {
      directive.recalcHeight();
    }
  }

  recalculateAllTables(): void {
    this.tables.forEach((directive) => directive.recalcHeight());
  }
}
