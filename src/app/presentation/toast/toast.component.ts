// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders toast notifications including interactive reply toasts with single/multi-select options.
 * @param toastService - Injected service providing the toast array
 */

import { Component, TemplateRef, inject, signal } from '@angular/core';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { IToast } from './toast.interface';

@Component({
  selector: 'app-toasts',
  template: `
    @for (toast of toastService.toasts; track toast.id) {
    <ngb-toast
      [class]="toast.classname"
      [autohide]="toast.autohide ?? true"
      [delay]="toast.delay || 5000"
      (hidden)="onToastHidden(toast)"
      style="height: auto !important;"
    >
      @if (isTemplate(toast)) {
      <ng-template [ngTemplateOutlet]="getTemplate(toast)"></ng-template>
      } @else {
      <div class="toast-content">
        @if (toast.icon) {
        <span class="toast-icon me-2">{{ toast.icon }}</span>
        }
        <span>{{ toast.textOrTpl }}</span>
      </div>

      @if (toast.showTextField) {
      <div class="mt-2">
        <textarea
          class="form-control form-control-sm"
          [ngModel]="toast.textFieldValue"
          [rows]="calculateRows(toast.textFieldValue || '')"
          style="resize: none; overflow: hidden;"
        ></textarea>
      </div>
      }

      @if (toast.interactive) {
      <div class="interactive-replies mt-2">
        @if (toast.interactive.repliesConfig.selectionMode === 'single') {
        <div class="reply-chips">
          @for (option of toast.interactive.repliesConfig.options; track option.value) {
          <button
            type="button"
            class="reply-chip-btn"
            (click)="onOptionClick(toast, option.value)"
          >
            {{ option.label }}
          </button>
          }
        </div>
        }

        @if (toast.interactive.repliesConfig.selectionMode === 'multi') {
        <div class="reply-checkboxes">
          @for (option of toast.interactive.repliesConfig.options; track option.value) {
          <label class="reply-checkbox-label" [class.checked]="isChecked(toast.id, option.value)">
            <input
              type="checkbox"
              [checked]="isChecked(toast.id, option.value)"
              (change)="onCheckboxToggle(toast.id, option.value)"
            />
            <span class="checkbox-text">{{ option.label }}</span>
          </label>
          }
        </div>
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="getCheckedCount(toast.id) === 0"
          (click)="onMultiConfirm(toast)"
        >
          Bestätigen
        </button>
        }

        <button
          type="button"
          class="reply-dismiss-btn"
          (click)="onDismissInteractive(toast)"
        >
          Überspringen
        </button>
      </div>
      }
      }
    </ngb-toast>
    }
  `,
  styleUrls: ['./toast.component.scss'],
  host: {
    class: 'toast-container position-fixed top-0 end-0 p-3',
    style: 'z-index: 1200',
  },
  standalone: true,
  imports: [CommonModule, FormsModule, NgbToastModule],
})
export class ToastsContainerComponent {
  toastService = inject(ToastService);

  private checkedState = signal<Map<string, Set<string>>>(new Map());

  calculateRows(text: string): number {
    if (!text || text.length === 0) return 1;

    const charsPerLine = 50;
    const maxRows = 5;
    const minRows = 2;

    const paragraphLines = text.split('\n');
    let totalLines = 0;

    for (const para of paragraphLines) {
      const words = para.split(/\s+/);

      if (words.length === 1 && words[0] === '') {
        totalLines += 1;
        continue;
      }

      let currentLineLength = 0;
      let linesInThisPara = 0;

      for (const w of words) {
        const wordLength = w.length;

        if (currentLineLength === 0) {
          currentLineLength = wordLength;
        } else {
          if (currentLineLength + 1 + wordLength <= charsPerLine) {
            currentLineLength += 1 + wordLength;
          } else {
            linesInThisPara += 1;
            currentLineLength = wordLength;
          }
        }
      }

      if (currentLineLength > 0) {
        linesInThisPara += 1;
      }

      totalLines += linesInThisPara;
    }

    if (totalLines < minRows) return minRows;
    if (totalLines > maxRows) return maxRows;
    return totalLines;
  }

  isTemplate(toast: IToast): boolean {
    return toast.textOrTpl instanceof TemplateRef;
  }

  getTemplate(toast: IToast): TemplateRef<unknown> {
    return toast.textOrTpl as TemplateRef<unknown>;
  }

  onToastHidden(toast: IToast): void {
    if (toast.interactive) return;
    this.toastService.remove(toast);
  }

  onOptionClick(toast: IToast, value: string): void {
    toast.interactive?.onSelected([value]);
    this.toastService.remove(toast);
  }

  onCheckboxToggle(toastId: string, value: string): void {
    const map = new Map(this.checkedState());
    const current = map.get(toastId) ?? new Set<string>();
    const updated = new Set(current);

    if (updated.has(value)) {
      updated.delete(value);
    } else {
      updated.add(value);
    }

    map.set(toastId, updated);
    this.checkedState.set(map);
  }

  isChecked(toastId: string, value: string): boolean {
    return this.checkedState().get(toastId)?.has(value) ?? false;
  }

  getCheckedCount(toastId: string): number {
    return this.checkedState().get(toastId)?.size ?? 0;
  }

  onMultiConfirm(toast: IToast): void {
    const values = [...(this.checkedState().get(toast.id) ?? [])];
    toast.interactive?.onSelected(values);
    this.cleanupCheckedState(toast.id);
    this.toastService.remove(toast);
  }

  onDismissInteractive(toast: IToast): void {
    toast.interactive?.onDismissed?.();
    this.cleanupCheckedState(toast.id);
    this.toastService.remove(toast);
  }

  private cleanupCheckedState(toastId: string): void {
    const map = new Map(this.checkedState());
    map.delete(toastId);
    this.checkedState.set(map);
  }
}
