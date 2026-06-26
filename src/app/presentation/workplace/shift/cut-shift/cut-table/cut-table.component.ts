// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/domain/models/shift/shift-class';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';

@Component({
  selector: 'app-cut-shift-table',
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule],
  templateUrl: './cut-table.component.html',
  styleUrl: './cut-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CutTableComponent {
  private textFormatterService = inject(TextFormatterService);
  readonly shifts = input<IShift[]>();
  readonly selectedShiftId = input<string>(); // Input für externe Selektion
  readonly rowClicked = output<Shift>();
  readonly cellUpdated = output<{
    shift: Shift;
    field: string;
    value: string;
}>();

  highlightRowId?: string;
  selectedRowId = signal<string | undefined>(undefined);
  hoveredRowId?: string;

  // Inline editing properties
  editingCell: { rowId: string; field: string } | null = null;

  private formModel = signal<{ editingValue: string }>({ editingValue: '' });
  protected editForm = form(this.formModel);

  formatTime = formatTime;

  constructor() {
    effect(() => {
      const id = this.selectedShiftId();
      if (id) {
        this.selectedRowId.set(id);
      }
    });
  }

  onMouseEnter(data: Shift): void {
    this.hoveredRowId = data.id;
  }

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

  onClickRow(data: Shift) {
    this.selectedRowId.set(data.id);
    this.rowClicked.emit(data);
  }

  onCellClick(event: Event, shift: Shift, field: string): void {
    if (this.selectedRowId() !== shift.id) {
      this.selectedRowId.set(shift.id);
      this.rowClicked.emit(shift);
      event.stopPropagation();
      return;
    }

    event.stopPropagation();
    this.startCellEditing(shift, field);
  }

  private startCellEditing(shift: Shift, field: string): void {
    this.editingCell = { rowId: shift.id!, field };

    let value = '';
    switch (field) {
      case 'name':
        value = shift.name;
        break;
      case 'description':
        value = shift.description;
        break;
      case 'abbreviation':
        value = shift.abbreviation;
        break;
    }
    this.formModel.set({ editingValue: value });

    setTimeout(() => {
      const input = document.querySelector(
        '.editing-input'
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  onInputKeyDown(event: KeyboardEvent, shift: Shift, field: string): void {
    if (event.key === 'Enter') {
      this.saveCellEdit(shift, field);
    } else if (event.key === 'Escape') {
      this.cancelCellEdit();
    }
  }

  onInputBlur(shift: Shift, field: string): void {
    this.saveCellEdit(shift, field);
  }

  private saveCellEdit(shift: Shift, field: string): void {
    const editingValue = this.formModel().editingValue;
    if (editingValue !== this.getCellValue(shift, field)) {
      this.cellUpdated.emit({
        shift: shift,
        field: field,
        value: editingValue,
      });
    }
    this.editingCell = null;
    this.formModel.set({ editingValue: '' });
  }

  private cancelCellEdit(): void {
    this.editingCell = null;
    this.formModel.set({ editingValue: '' });
  }

  private getCellValue(shift: Shift, field: string): string {
    switch (field) {
      case 'name':
        return shift.name;
      case 'description':
        return shift.description;
      case 'abbreviation':
        return shift.abbreviation;
      default:
        return '';
    }
  }

  isEditing(rowId: string, field: string): boolean {
    return (
      this.editingCell?.rowId === rowId && this.editingCell?.field === field
    );
  }

  getPlainTextDescription(shift: IShift): string {
    if (!shift?.description) {
      return '';
    }
    return this.textFormatterService.stripFormatting(shift.description);
  }
}
