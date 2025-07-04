import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift, Shift } from 'src/app/core/schedule-class';
import { IconScissorComponent } from 'src/app/icons/icon-scissor.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';

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
    IconScissorComponent,
  ],
})
export class OriginalTableComponent {
  public translate = inject(TranslateService);
  @Input() shifts: IShift[] | undefined;
  @Output() editClicked = new EventEmitter<Shift>();
  @Output() deleteClicked = new EventEmitter<Shift>();

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
}
