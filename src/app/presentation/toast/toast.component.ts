// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders toast notifications including interactive reply toasts with single-select, multi-select,
 * date-picker and number-field options. The number field carries the min/max/step the assistant sent
 * with the question, so an answer with a known valid range is entered in a bounded control instead of
 * free text that costs a correction turn. Action toasts render one button per action; choosing one
 * removes the toast and runs the action. An action toast (e.g. a reload countdown) mutes its own
 * `ngb-toast` live region and gets `role="status"` instead of the default `role="alert"`; it is
 * announced once through `LiveRegionService`, so a text update such as a per-second countdown does not
 * repeat the announcement. Verified in the DOM by the component spec, not with a real screen reader.
 * @param toastService - Injected service providing the toast array
 */

import { ChangeDetectionStrategy, Component, TemplateRef, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from './toast.service';
import { IToast } from './toast.interface';
import { IToastAction } from './toast-action.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { LiveRegionService } from 'src/app/application/services/live-region.service';

@Component({
  selector: 'app-toasts',
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      @if (isActionToast(toast)) {
      <ngb-toast
        [class]="toast.classname"
        [autohide]="toast.autohide ?? true"
        [delay]="toast.delay || 5000"
        aria-live="off"
        role="status"
        (hidden)="onToastHidden(toast)"
        style="height: auto !important;"
      >
        <ng-container [ngTemplateOutlet]="toastBody" [ngTemplateOutletContext]="{ $implicit: toast }"></ng-container>
      </ngb-toast>
      } @else {
      <ngb-toast
        [class]="toast.classname"
        [autohide]="toast.autohide ?? true"
        [delay]="toast.delay || 5000"
        (hidden)="onToastHidden(toast)"
        style="height: auto !important;"
      >
        <ng-container [ngTemplateOutlet]="toastBody" [ngTemplateOutletContext]="{ $implicit: toast }"></ng-container>
      </ngb-toast>
      }
    }
    <ng-template #toastBody let-toast>
      @let t = asToast(toast);
      @if (isTemplate(t)) {
      <ng-template [ngTemplateOutlet]="getTemplate(t)"></ng-template>
      } @else {
      <div class="toast-content">
        @if (t.icon) {
        <span class="toast-icon me-2">{{ t.icon }}</span>
        }
        <span class="toast-text">{{ t.textOrTpl }}</span>
      </div>

      @if (t.showTextField) {
      <div class="mt-2">
        <textarea
          class="form-control form-control-sm"
          [value]="t.textFieldValue || ''"
          [rows]="calculateRows(t.textFieldValue || '')"
          style="resize: none; overflow: hidden;"
          readonly
        ></textarea>
      </div>
      }

      @if (t.undo) {
      <div class="undo-action mt-2">
        <button type="button" class="undo-btn" (click)="onUndoClick(t)">
          <svg
            class="undo-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8v6h6" />
            <path d="M3.5 14a8.5 8.5 0 1 0 2.2-8.1L3 8" />
          </svg>
          <span>{{ t.undo.label }}</span>
        </button>
        <div class="undo-progress">
          <div class="undo-progress-bar" [style.animation-duration.ms]="t.delay"></div>
        </div>
      </div>
      }

      @if (t.actions?.length) {
      <div class="toast-actions mt-2">
        @for (action of t.actions; track $index) {
        <button type="button" class="toast-action-btn" (click)="onActionClick(t, action)">
          {{ action.label }}
        </button>
        }
      </div>
      }

      @if (t.interactive) {
      <div class="interactive-replies mt-2">
        @if (t.interactive.repliesConfig.selectionMode === 'single') {
        <div class="reply-chips">
          @for (option of t.interactive.repliesConfig.options; track option.value) {
          <button
            type="button"
            class="reply-chip-btn"
            (click)="onOptionClick(t, option.value)"
          >
            {{ option.label }}
          </button>
          }
        </div>
        }

        @if (t.interactive.repliesConfig.selectionMode === 'multi') {
        <div class="reply-checkboxes">
          @for (option of t.interactive.repliesConfig.options; track option.value) {
          <label class="reply-checkbox-label" [class.checked]="isChecked(t.id, option.value)">
            <input
              type="checkbox"
              [checked]="isChecked(t.id, option.value)"
              (change)="onCheckboxToggle(t.id, option.value)"
            />
            <span class="checkbox-text">{{ option.label }}</span>
          </label>
          }
        </div>
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="getCheckedCount(t.id) === 0"
          (click)="onMultiConfirm(t)"
        >
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        @if (t.interactive.repliesConfig.selectionMode === 'date') {
        @if (t.interactive.repliesConfig.prompt) {
        <div class="reply-date-heading">{{ t.interactive.repliesConfig.prompt }}</div>
        }
        <input
          type="date"
          class="form-control form-control-sm reply-date-input"
          [value]="getDateValue(t.id)"
          (input)="onDateInput(t.id, $event)"
        />
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="!getDateValue(t.id)"
          (click)="onDateConfirm(t)"
        >
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        @if (t.interactive.repliesConfig.selectionMode === 'number') {
        @if (t.interactive.repliesConfig.prompt) {
        <div class="reply-date-heading">{{ t.interactive.repliesConfig.prompt }}</div>
        }
        <input
          type="number"
          class="form-control form-control-sm reply-number-input"
          [attr.min]="t.interactive.repliesConfig.min"
          [attr.max]="t.interactive.repliesConfig.max"
          [attr.step]="t.interactive.repliesConfig.step"
          [value]="getNumberValue(t.id)"
          (input)="onNumberInput(t.id, $event)"
        />
        @if (numberRangeHint(t.interactive.repliesConfig); as rangeHint) {
        <div class="reply-number-range">{{ rangeHint }}</div>
        }
        <button
          type="button"
          class="reply-confirm-btn mt-2"
          [disabled]="!isNumberValid(t.id, t.interactive.repliesConfig)"
          (click)="onNumberConfirm(t)"
        >
          {{ 'assistant-chat.replies.confirm' | translate }}
        </button>
        }

        <button
          type="button"
          class="reply-dismiss-btn"
          (click)="onDismissInteractive(t)"
        >
          {{ 'cancel' | translate }}
        </button>
      </div>
      }
      }
    </ng-template>
  `,
  styleUrls: ['./toast.component.scss'],
  host: {
    class: 'toast-container',
    style: 'position: static',
  },
  standalone: true,
  imports: [NgTemplateOutlet, NgbToastModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastsContainerComponent {
  readonly toastService = inject(ToastService);
  private readonly liveRegion = inject(LiveRegionService);

  private readonly checkedState = signal<Map<string, Set<string>>>(new Map());
  private readonly dateState = signal<Map<string, string>>(new Map());
  private readonly numberState = signal<Map<string, string>>(new Map());
  private readonly announcedActionToastIds = new Set<string>();

  constructor() {
    effect(() => {
      const toasts = this.toastService.toasts();
      const currentIds = new Set(toasts.map((toast) => toast.id));
      for (const toast of toasts) {
        if (this.needsAnnouncement(toast)) {
          this.announcedActionToastIds.add(toast.id);
          this.liveRegion.announce(toast.textOrTpl as string);
        }
      }
      for (const id of this.announcedActionToastIds) {
        if (!currentIds.has(id)) {
          this.announcedActionToastIds.delete(id);
        }
      }
    });
  }

  private needsAnnouncement(toast: IToast): boolean {
    return (
      this.isActionToast(toast) &&
      typeof toast.textOrTpl === 'string' &&
      !this.announcedActionToastIds.has(toast.id)
    );
  }

  isActionToast(toast: IToast): boolean {
    return (toast.actions?.length ?? 0) > 0;
  }

  asToast(value: unknown): IToast {
    return value as IToast;
  }

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

  onUndoClick(toast: IToast): void {
    toast.undo?.onUndo();
    this.toastService.remove(toast);
  }

  onActionClick(toast: IToast, action: IToastAction): void {
    this.toastService.remove(toast);
    action.onClick();
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
