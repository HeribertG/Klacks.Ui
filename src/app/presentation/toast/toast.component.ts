import { Component, TemplateRef } from '@angular/core';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-toasts',
  template: `
    @for (toast of toastService.toasts; track toast.id || $index) {
    <ngb-toast
      [class]="toast.classname"
      [autohide]="true"
      [delay]="toast.delay || 5000"
      (hidden)="toastService.remove(toast)"
      style="height: auto !important;"
    >
      @if (isTemplate(toast)) {
      <ng-template [ngTemplateOutlet]="toast.textOrTpl"></ng-template>
      } @else {
      {{ toast.textOrTpl }}

      @if (toast.showTextField) {
      <div class="mt-2">
        <textarea
          class="form-control form-control-sm"
          [ngModel]="toast.textFieldValue"
          [rows]="calculateRows(toast.textFieldValue)"
          style="resize: none; overflow: hidden;"
        ></textarea>
      </div>
      } }
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
  constructor(public toastService: ToastService) {}

  calculateRows(text: string): number {
    if (!text || text.length === 0) {
      return 1;
    }

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

    if (totalLines < minRows) {
      return minRows;
    } else if (totalLines > maxRows) {
      return maxRows;
    } else {
      return totalLines;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isTemplate(toast: { textOrTpl: any }) {
    return toast.textOrTpl instanceof TemplateRef;
  }
}
