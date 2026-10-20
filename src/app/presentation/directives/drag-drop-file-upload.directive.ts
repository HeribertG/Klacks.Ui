// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Directive,
  HostListener,
  HostBinding,
  output
} from '@angular/core';

const IDLE_BACKGROUND = 'transparent';
const DRAG_OVER_BACKGROUND = 'var(--backgroundColorHover)';

@Directive({
  selector: '[appDragDropFileUpload]',
  standalone: true,
})
export class DragDropFileUploadDirective {
  readonly fileDropped = output<any>();

  @HostBinding('style.background-color') background = IDLE_BACKGROUND;

  // Dragover Event
  @HostListener('dragover', ['$event']) dragOver(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = DRAG_OVER_BACKGROUND;
  }

  // Dragleave Event
  @HostListener('dragleave', ['$event']) public dragLeave(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = IDLE_BACKGROUND;
  }

  // Drop Event
  @HostListener('drop', ['$event']) public drop(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = IDLE_BACKGROUND;
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}
