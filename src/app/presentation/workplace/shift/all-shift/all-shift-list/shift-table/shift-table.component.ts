// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/domain/models/shift/shift-class';
import { IconBoxComponent } from 'src/app/presentation/icons/icon-box.component';
import { IconBoxContainerComponent } from 'src/app/presentation/icons/icon-box-container.component';
import { IconScissorComponent } from 'src/app/presentation/icons/icon-scissor.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';

@Component({
  selector: 'app-shift-table',
  templateUrl: './shift-table.component.html',
  styleUrl: './shift-table.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PencilIconGreyComponent,
    IconScissorComponent,
    IconBoxComponent,
    IconBoxContainerComponent,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
  ],
})
export class ShiftTableComponent {
  private textFormatterService = inject(TextFormatterService);
  @Input() shifts: IShift[] | undefined;
  @Input() sortingService!: TableSortingService;
  @Input() tableMode: 'cut' | 'container' = 'cut';
  @Output() editClicked = new EventEmitter<Shift>();
  @Output() actionClicked = new EventEmitter<Shift>();
  @Output() rowClicked = new EventEmitter<Shift>();
  @Output() headerClicked = new EventEmitter<string>();

  highlightRowId?: string;
  selectedRowId?: string;
  hoveredRowId?: string;

  formatTime = formatTime;

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
  onClickAction(s: Shift, $event: MouseEvent) {
    $event.stopPropagation();
    this.actionClicked.emit(s);
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

  shouldShowCutIcon(shift: IShift): boolean {
    return this.tableMode === 'cut' && (shift.status === 2 || shift.status === 3) && shift.shiftType === 0;
  }

  shouldShowSporadicIcon(shift: IShift): boolean {
    return this.shouldShowCutIcon(shift) && shift.isSporadic;
  }

  shouldShowTimeRangeIcon(shift: IShift): boolean {
    return this.shouldShowCutIcon(shift) && !shift.isSporadic && shift.isTimeRange;
  }

  shouldShowShiftSegmentIcon(shift: IShift): boolean {
    return this.shouldShowCutIcon(shift) && !shift.isSporadic && !shift.isTimeRange;
  }

  shouldShowContainerIcon(): boolean {
    return this.tableMode === 'container';
  }
}
