// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  ChangeDetectorRef, Component, EventEmitter, inject, Output,
  ChangeDetectionStrategy,
  input
} from '@angular/core';

import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { IconBoldGreyComponent } from '../../icons/icon-bold-grey.component';
import { IconItalicGreyComponent } from '../../icons/icon-italic-grey.component';
import { IconUnderlineGreyComponent } from '../../icons/icon-underline-grey.component';
import { IconListGreyComponent } from '../../icons/icon-list-grey.component';
import { IconAlignLeftGreyComponent } from '../../icons/icon-align-left-grey.component';
import { IconAlignCenterGreyComponent } from '../../icons/icon-align-center-grey.component';
import { IconAlignRightGreyComponent } from '../../icons/icon-align-right-grey.component';
import { IconCopyGreyComponent } from '../../icons/icon-copy-grey.component';
import { IconCutGreyComponent } from '../../icons/icon-cut-grey.component';
import { IconPasteGreyComponent } from '../../icons/icon-paste-grey.component';
import { InitContentDirective } from './init-content.directive';
import { TextFormatterService } from './text-formatter.service';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  standalone: true,
  imports: [
    NgbTooltipModule,
    TranslateModule,
    IconBoldGreyComponent,
    IconItalicGreyComponent,
    IconUnderlineGreyComponent,
    IconListGreyComponent,
    IconAlignLeftGreyComponent,
    IconAlignCenterGreyComponent,
    IconAlignRightGreyComponent,
    IconCopyGreyComponent,
    IconCutGreyComponent,
    IconPasteGreyComponent,
    InitContentDirective
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditorComponent {
  readonly content = input('');
  readonly disabled = input(false);
  readonly editorId = input('rich-text-editor');
  readonly placeholder = input('');
  readonly showToolbar = input(true);
  readonly showToolbarOnlyOnFocus = input(true);
  readonly height = input<string>();

  @Output() contentChange = new EventEmitter<string>();
  @Output() plainTextChange = new EventEmitter<string>();
  @Output() focused = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();

  isFocused = false;

  private textFormatterService = inject(TextFormatterService);
  private cdr = inject(ChangeDetectorRef);

  onFocus(): void {
    this.isFocused = true;
    this.focused.emit();
  }

  onBlur(): void {
    setTimeout(() => {
      this.isFocused = false;
      this.blurred.emit();
      this.cdr.markForCheck();
    }, 200);
  }

  formatText(command: string): void {
    const editable = document.getElementById(this.editorId());
    if (!editable) {
      return;
    }

    editable.focus();
    document.execCommand(command, false, undefined);

    const htmlContent = editable.innerHTML;
    this.contentChange.emit(htmlContent);
    this.plainTextChange.emit(this.textFormatterService.stripFormatting(htmlContent));
  }

  onContentChange(event: Event): void {
    const target = event.target as HTMLDivElement;
    if (target) {
      const htmlContent = target.innerHTML;
      this.contentChange.emit(htmlContent);
      this.plainTextChange.emit(this.textFormatterService.stripFormatting(htmlContent));
    }
  }

  async onCopy(): Promise<void> {
    const editable = document.getElementById(this.editorId()) as HTMLDivElement;
    if (!editable) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString() || editable.innerText;

    try {
      await navigator.clipboard.writeText(selectedText);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  async onCut(): Promise<void> {
    const editable = document.getElementById(this.editorId()) as HTMLDivElement;
    if (!editable) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedText);
      selection.deleteFromDocument();

      const htmlContent = editable.innerHTML;
      this.contentChange.emit(htmlContent);
      this.plainTextChange.emit(this.textFormatterService.stripFormatting(htmlContent));

      setTimeout(() => {
        editable.focus();
      }, 0);
    } catch (err) {
      console.error('Failed to cut text:', err);
    }
  }

  async onPaste(): Promise<void> {
    const editable = document.getElementById(this.editorId()) as HTMLDivElement;
    if (!editable) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(clipboardText);
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      const htmlContent = editable.innerHTML;
      this.contentChange.emit(htmlContent);
      this.plainTextChange.emit(this.textFormatterService.stripFormatting(htmlContent));

      setTimeout(() => {
        editable.focus();
      }, 0);
    } catch (err) {
      console.error('Failed to paste text:', err);
    }
  }
}
