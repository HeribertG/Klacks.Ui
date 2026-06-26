// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementExpensesService } from 'src/app/domain/services/expenses/data-management-expenses.service';
import { ExpensesRequest, ExpensesResource } from 'src/app/domain/models/expenses/expenses';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';

interface ExpensesFormModel {
  amount: number;
  description: string;
  taxable: boolean;
}

@Component({
  selector: 'app-expenses-dialog',
  templateUrl: './expenses-dialog.component.html',
  styleUrls: ['./expenses-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('expensesModal');

  private ngbModal = inject(NgbModal);
  private expensesService = inject(DataManagementExpensesService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  workId = '';
  clientId = '';
  currentDate: Date | null = null;

  private formModel = signal<ExpensesFormModel>({
    amount: 0,
    description: '',
    taxable: false,
  });
  protected expensesForm = form(this.formModel);

  private modalRef: NgbModalRef | null = null;
  private editMode = false;
  private editId = '';

  open(workId: string, clientId: string, currentDate: Date): void {
    this.editMode = false;
    this.editId = '';
    this.workId = workId;
    this.clientId = clientId;
    this.currentDate = currentDate;
    this.reset();
    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
    });
  }

  openEdit(expenseId: string, clientId: string, currentDate: Date): void {
    this.editMode = true;
    this.editId = expenseId;
    this.clientId = clientId;
    this.currentDate = currentDate;

    this.expensesService.get(expenseId).subscribe({
      next: (data) => {
        this.workId = data.workId;
        this.formModel.set({
          amount: data.amount,
          description: data.description || '',
          taxable: data.taxable,
        });
        this.cdr.markForCheck();

        this.modalRef = this.ngbModal.open(this.modalTemplate(), {
          centered: true,
          backdrop: 'static',
        });
      },
      error: (err) => {
        console.error('Error loading Expenses:', err);
      },
    });
  }

  private reset(): void {
    this.formModel.set({ amount: 0, description: '', taxable: false });
  }

  isValid(): boolean {
    return this.formModel().amount > 0;
  }

  onSave(): void {
    if (!this.isValid()) return;

    if (this.editMode) {
      this.updateExpenses();
    } else {
      this.createExpenses();
    }
  }

  private createExpenses(): void {
    const { amount, description, taxable } = this.formModel();
    const request: ExpensesRequest = {
      workId: this.workId,
      amount,
      description,
      taxable,
    };

    this.expensesService.create(request).subscribe({
      next: (response) => {
        this.applyResponseAndClose(response);
      },
      error: (err) => {
        console.error('Error creating expenses:', err);
      },
    });
  }

  private updateExpenses(): void {
    const { amount, description, taxable } = this.formModel();
    const resource: ExpensesResource = {
      id: this.editId,
      workId: this.workId,
      amount,
      description,
      taxable,
    };

    this.expensesService.update(resource).subscribe({
      next: (response) => {
        this.applyResponseAndClose(response);
      },
      error: (err) => {
        console.error('Error updating expenses:', err);
      },
    });
  }

  private applyResponseAndClose(response: ExpensesResource): void {
    if (this.currentDate && this.clientId && response?.scheduleEntries?.length) {
      this.scheduleEntryCrud.applyExpensesSingleClientResponse(
        response,
        this.clientId,
        this.currentDate,
      );
    }
    this.modalRef?.close();
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
