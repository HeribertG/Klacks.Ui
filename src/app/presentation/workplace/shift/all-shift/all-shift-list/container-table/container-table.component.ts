import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/domain/models/shift-class';
import { IconScissorComponent } from 'src/app/presentation/icons/icon-scissor.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';

@Component({
  selector: 'app-container-table',
  templateUrl: './container-table.component.html',
  styleUrl: './container-table.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PencilIconGreyComponent,
    IconScissorComponent,
  ],
})
export class ContainerTableComponent {
  public translate = inject(TranslateService);
  private textFormatterService = inject(TextFormatterService);
  @Input() shifts: IShift[] | undefined;
  @Input() sortingService!: TableSortingService;
  @Output() editClicked = new EventEmitter<Shift>();
  @Output() cutClicked = new EventEmitter<Shift>();
  @Output() rowClicked = new EventEmitter<Shift>();
  @Output() headerClicked = new EventEmitter<string>();

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
  onClickEdit(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
    this.editClicked.emit(s);
  }
  onClickCut(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
    this.cutClicked.emit(s);
  }
  onClickHeader(columnKey: string): void {
    this.headerClicked.emit(columnKey);
  }

  getPlainTextDescription(shift: IShift): string {
    if (!shift?.description) {
      return '';
    }
    return this.textFormatterService.stripFormatting(shift.description);
  }
}
