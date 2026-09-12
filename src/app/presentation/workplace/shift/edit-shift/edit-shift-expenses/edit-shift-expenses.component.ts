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
  effect,
  inject,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ShiftEditPermissionService } from 'src/app/application/services/shift-edit-permission.service';
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
  readonly isReadOnly = input(false);
  readonly isChangingEvent = output<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  private shiftEditPermission = inject(ShiftEditPermissionService);
  private cdr = inject(ChangeDetectorRef);

  visibleTable = 'inline';

  /**
   * The route only asks for CanViewShifts, so a reader without the write right reaches this card;
   * the readonly query parameter alone would leave the add, edit and delete controls live for them.
   * ShiftEditPermissionService picks CanCreateShifts or CanEditShifts by whether the shift is new.
   */
  get isFieldsDisabled(): boolean {
    return this.isReadOnly() || !this.shiftEditPermission.canWriteCurrentShift();
  }

  private isResetEffect = effect(() => {
    this.dataManagementShiftService.isReset();
    this.dataManagementShiftService.isRead();
    this.cdr.markForCheck();
  });

  get expenses(): IShiftExpense[] {
    return this.dataManagementShiftService.editShift?.defaultExpenses ?? [];
  }

  onClickVisibleTable(): void {
    this.visibleTable = this.visibleTable === 'inline' ? 'none' : 'inline';
  }

  onAdd(): void {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift || this.isFieldsDisabled) return;

    const expense = new ShiftExpense();
    expense.shiftId = shift.id ?? '';
    shift.defaultExpenses = [...shift.defaultExpenses, expense];
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }

  onChange(): void {
    this.isChangingEvent.emit(true);
  }

  onDelete(expense: IShiftExpense): void {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift || this.isFieldsDisabled) return;

    shift.defaultExpenses = shift.defaultExpenses.filter(e => e !== expense);
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }
}
