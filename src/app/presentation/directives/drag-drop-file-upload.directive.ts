// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Directive,
  HostListener,
  HostBinding,
  output
} from '@angular/core';

@Directive({
  selector: '[appDragDropFileUpload]',
  standalone: true,
})
export class DragDropFileUploadDirective {
  readonly fileDropped = output<any>();

  @HostBinding('style.background-color') background = '#ffffff';

  // Dragover Event
  @HostListener('dragover', ['$event']) dragOver(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#e2eefd';
  }

  // Dragleave Event
  @HostListener('dragleave', ['$event']) public dragLeave(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#ffffff';
  }

  // Drop Event
  @HostListener('drop', ['$event']) public drop(event: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#ffffff';
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}
