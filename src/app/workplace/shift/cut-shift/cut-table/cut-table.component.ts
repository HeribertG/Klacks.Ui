import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/core/shift-class';

@Component({
  selector: 'app-cut-shift-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './cut-table.component.html',
  styleUrl: './cut-table.component.scss'
})
export class CutTableComponent {
  public translate = inject(TranslateService);
  @Input() shifts: IShift[] | undefined;
  @Output() rowClicked = new EventEmitter<Shift>();

  highlightRowId?: string;
  selectedRowId?: string;
  hoveredRowId?: string;

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
}