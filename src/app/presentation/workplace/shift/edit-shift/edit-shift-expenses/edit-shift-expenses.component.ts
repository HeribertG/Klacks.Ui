// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card component for managing default expenses on a shift template (in-memory).
 * Expenses are saved together with the shift via Savebar.
 * @param isReadOnly - Disables editing when true
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { IShiftExpense, ShiftExpense } from 'src/app/domain/models/shift/shift-expense.model';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-edit-shift-expenses',
  templateUrl: './edit-shift-expenses.component.html',
  styleUrls: ['./edit-shift-expenses.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    TrashIconRedComponent,
  ],
})
export class EditShiftExpensesComponent {
  @Input() isReadOnly = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  private cdr = inject(ChangeDetectorRef);

  visibleTable = 'inline';

  get expenses(): IShiftExpense[] {
    return this.dataManagementShiftService.editShift?.defaultExpenses ?? [];
  }

  onClickVisibleTable(): void {
    this.visibleTable = this.visibleTable === 'inline' ? 'none' : 'inline';
  }

  onAdd(): void {
    if (!this.dataManagementShiftService.editShift) return;

    const expense = new ShiftExpense();
    expense.shiftId = this.dataManagementShiftService.editShift.id ?? '';
    this.dataManagementShiftService.editShift.defaultExpenses.push(expense);
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }

  onChange(): void {
    this.isChangingEvent.emit(true);
  }

  onDelete(expense: IShiftExpense): void {
    if (!this.dataManagementShiftService.editShift) return;

    const list = this.dataManagementShiftService.editShift.defaultExpenses;
    const index = list.indexOf(expense);
    if (index >= 0) {
      list.splice(index, 1);
    }
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }
}
