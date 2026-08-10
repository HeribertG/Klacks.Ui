// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders toast notifications including interactive reply toasts with single-select, multi-select,
 * date-picker and number-field options. The number field carries the min/max/step the assistant sent
 * with the question, so an answer with a known valid range is entered in a bounded control instead of
 * free text that costs a correction turn.
 * @param toastService - Injected service providing the toast array
 */

import { ChangeDetectionStrategy, Component, TemplateRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from './toast.service';
import { IToast } from './toast.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';

@Component({
  selector: 'app-toasts',
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
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
        <span class="toast-text">{{ toast.textOrTpl }}</span>
      </div>

      @if (toast.showTextField) {
      <div class="mt-2">
        <textarea
          class="form-control form-control-sm"
          [value]="toast.textFieldValue || ''"
          [rows]="calculateRows(toast.textFieldValue || '')"
          style="resize: none; overflow: hidden;"
          readonly
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
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        @if (toast.interactive.repliesConfig.selectionMode === 'date') {
        @if (toast.interactive.repliesConfig.prompt) {
        <div class="reply-date-heading">{{ toast.interactive.repliesConfig.prompt }}</div>
        }
        <input
          type="date"
          class="form-control form-control-sm reply-date-input"
          [value]="getDateValue(toast.id)"
          (input)="onDateInput(toast.id, $event)"
        />
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="!getDateValue(toast.id)"
          (click)="onDateConfirm(toast)"
        >
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        @if (toast.interactive.repliesConfig.selectionMode === 'number') {
        @if (toast.interactive.repliesConfig.prompt) {
        <div class="reply-date-heading">{{ toast.interactive.repliesConfig.prompt }}</div>
        }
        <input
          type="number"
          class="form-control form-control-sm reply-number-input"
          [attr.min]="toast.interactive.repliesConfig.min"
          [attr.max]="toast.interactive.repliesConfig.max"
          [attr.step]="toast.interactive.repliesConfig.step"
          [value]="getNumberValue(toast.id)"
          (input)="onNumberInput(toast.id, $event)"
        />
        @if (numberRangeHint(toast.interactive.repliesConfig); as rangeHint) {
        <div class="reply-number-range">{{ rangeHint }}</div>
        }
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="!isNumberValid(toast.id, toast.interactive.repliesConfig)"
          (click)="onNumberConfirm(toast)"
        >
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        <button
          type="button"
          class="reply-dismiss-btn"
          (click)="onDismissInteractive(toast)"
        >
          {{ 'cancel' | translate }}
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
  imports: [NgTemplateOutlet, NgbToastModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastsContainerComponent {
  readonly toastService = inject(ToastService);

  private readonly checkedState = signal<Map<string, Set<string>>>(new Map());
  private readonly dateState = signal<Map<string, string>>(new Map());
  private readonly numberState = signal<Map<string, string>>(new Map());

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

  onDateInput(toastId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const map = new Map(this.dateState());
    map.set(toastId, value);
    this.dateState.set(map);
  }

  getDateValue(toastId: string): string {
    return this.dateState().get(toastId) ?? '';
  }

  onDateConfirm(toast: IToast): void {
    const value = this.dateState().get(toast.id);
    if (!value) return;
    toast.interactive?.onSelected([value]);
    this.cleanupDateState(toast.id);
    this.toastService.remove(toast);
  }

  onNumberInput(toastId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const map = new Map(this.numberState());
    map.set(toastId, value);
    this.numberState.set(map);
  }

  getNumberValue(toastId: string): string {
    return this.numberState().get(toastId) ?? '';
  }

  /**
   * The bounds are also on the input element, but a browser spinner only blocks stepping past them —
   * a typed or pasted value still lands in the field. Gating the confirm button here is what keeps an
   * out-of-range answer from being sent as chat text.
   */
  isNumberValid(toastId: string, config: ISuggestedRepliesConfig): boolean {
    const raw = this.getNumberValue(toastId);
    if (!raw.trim()) {
      return false;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return false;
    }

    if (config.min !== undefined && config.min !== null && parsed < config.min) {
      return false;
    }

    return !(config.max !== undefined && config.max !== null && parsed > config.max);
  }

  numberRangeHint(config: ISuggestedRepliesConfig): string {
    const hasMin = config.min !== undefined && config.min !== null;
    const hasMax = config.max !== undefined && config.max !== null;

    if (hasMin && hasMax) {
      return `${config.min} – ${config.max}`;
    }
    if (hasMin) {
      return `≥ ${config.min}`;
    }
    if (hasMax) {
      return `≤ ${config.max}`;
    }
    return '';
  }

  onNumberConfirm(toast: IToast): void {
    const config = toast.interactive?.repliesConfig;
    if (!config || !this.isNumberValid(toast.id, config)) {
      return;
    }

    toast.interactive?.onSelected([this.getNumberValue(toast.id).trim()]);
    this.cleanupNumberState(toast.id);
    this.toastService.remove(toast);
  }

  onDismissInteractive(toast: IToast): void {
    toast.interactive?.onDismissed?.();
    this.cleanupCheckedState(toast.id);
    this.cleanupDateState(toast.id);
    this.cleanupNumberState(toast.id);
    this.toastService.remove(toast);
  }

  private cleanupCheckedState(toastId: string): void {
    const map = new Map(this.checkedState());
    map.delete(toastId);
    this.checkedState.set(map);
  }

  private cleanupDateState(toastId: string): void {
    const map = new Map(this.dateState());
    map.delete(toastId);
    this.dateState.set(map);
  }

  private cleanupNumberState(toastId: string): void {
    const map = new Map(this.numberState());
    map.delete(toastId);
    this.numberState.set(map);
  }
}
