import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropFileUploadDirective } from './drag-drop-file-upload.directive';

@Component({
  standalone: true,
  imports: [DragDropFileUploadDirective],
  template: `<div
    appDragDropFileUpload
    (fileDropped)="onFileDropped($event)"
  ></div>`,
})
class TestComponent {
  droppedFiles: any;

  onFileDropped(files: any) {
    this.droppedFiles = files;
  }
}

describe('DragDropFileUploadDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let divEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    divEl = fixture.nativeElement.querySelector('div') as HTMLElement;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directive = new DragDropFileUploadDirective();
    expect(directive).toBeTruthy();
  });

  it('should change background on dragover', () => {
    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
    });
    // Prevent default and propagation as in directive
    spyOn(dragOverEvent, 'preventDefault');
    spyOn(dragOverEvent, 'stopPropagation');

    divEl.dispatchEvent(dragOverEvent);
    fixture.detectChanges();

    expect(divEl.style.backgroundColor).toBe('rgb(226, 238, 253)');
  });

  it('should emit fileDropped event on drop', () => {
    spyOn(component, 'onFileDropped');
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: ['file1.txt'], length: 1 },
    });
    // Prevent default and propagation
    spyOn(dropEvent, 'preventDefault');
    spyOn(dropEvent, 'stopPropagation');

    divEl.dispatchEvent(dropEvent);
    fixture.detectChanges();

    expect(component.onFileDropped).toHaveBeenCalledWith(['file1.txt']);
  });
});
