import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/domain/models/shift-class';
import { InfoIconComponent } from 'src/app/presentation/icons/icon-info.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';

@Component({
  selector: 'app-original-table',
  templateUrl: './original-table.component.html',
  styleUrl: './original-table.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PencilIconGreyComponent,
    TrashIconRedComponent,
    InfoIconComponent,
  ],
})
export class OriginalTableComponent {
  public translate = inject(TranslateService);
  private textFormatterService = inject(TextFormatterService);
  @Input() shifts: IShift[] | undefined;
  @Input() isSealedOrder = false;
  @Input() sortingService!: TableSortingService;
  @Output() editClicked = new EventEmitter<Shift>();
  @Output() deleteClicked = new EventEmitter<Shift>();
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
  }
  onClickEdit(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
    this.editClicked.emit(s);
  }
  onClickDelete(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
    this.deleteClicked.emit(s);
  }
  onShowInfo(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
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
