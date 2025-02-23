import {
  Directive,
  EventEmitter,
  Output,
  HostListener,
  HostBinding,
} from '@angular/core';

@Directive({
    selector: '[appDragDropFileUpload]',
    standalone: false
})
export class DragDropFileUploadDirective {
  @Output() fileDropped = new EventEmitter<any>();

  @HostBinding('style.background-color') private background = '#ffffff';

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
