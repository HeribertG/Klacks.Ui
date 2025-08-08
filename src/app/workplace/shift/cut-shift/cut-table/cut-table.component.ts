import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/models/shift-class';

@Component({
  selector: 'app-cut-shift-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './cut-table.component.html',
  styleUrl: './cut-table.component.scss',
})
export class CutTableComponent implements OnChanges {
  public translate = inject(TranslateService);
  @Input() shifts: IShift[] | undefined;
  @Input() selectedShiftId?: string; // Input für externe Selektion
  @Output() rowClicked = new EventEmitter<Shift>();
  @Output() cellUpdated = new EventEmitter<{
    shift: Shift;
    field: string;
    value: string;
  }>();

  highlightRowId?: string;
  selectedRowId?: string;
  hoveredRowId?: string;

  // Inline editing properties
  editingCell: { rowId: string; field: string } | null = null;
  editingValue = '';

  ngOnChanges(changes: SimpleChanges): void {
    // Reagiere auf Änderungen der selectedShiftId von außen
    if (changes['selectedShiftId'] && changes['selectedShiftId'].currentValue) {
      this.selectedRowId = changes['selectedShiftId'].currentValue;
    }
  }

  onMouseEnter(data: Shift): void {
    this.hoveredRowId = data.id;
  }

  onMouseLeave(): void {
    this.hoveredRowId = undefined;
  }

  onClickRow(data: Shift) {
    this.selectedRowId = data.id;
    this.rowClicked.emit(data);
  }

  onCellClick(event: Event, shift: Shift, field: string): void {
    if (this.selectedRowId !== shift.id) {
      this.selectedRowId = shift.id;
      this.rowClicked.emit(shift);
      event.stopPropagation();
      return;
    }

    event.stopPropagation();
    this.startCellEditing(shift, field);
  }

  private startCellEditing(shift: Shift, field: string): void {
    this.editingCell = { rowId: shift.id!, field };

    switch (field) {
      case 'name':
        this.editingValue = shift.name;
        break;
      case 'description':
        this.editingValue = shift.description;
        break;
      case 'abbreviation':
        this.editingValue = shift.abbreviation;
        break;
    }

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
    if (this.editingValue !== this.getCellValue(shift, field)) {
      this.cellUpdated.emit({
        shift: shift,
        field: field,
        value: this.editingValue,
      });
    }
    this.editingCell = null;
    this.editingValue = '';
  }

  private cancelCellEdit(): void {
    this.editingCell = null;
    this.editingValue = '';
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
}
