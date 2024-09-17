import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropFileUploadDirective } from './drag-drop-file-upload.directive';

@Component({
  template: `<div
    appDragDropFileUpload
    (fileDropped)="onFileDropped($event)"
  ></div>`,
})
class TestComponent {
  onFileDropped(files: any) {}
}

describe('DragDropFileUploadDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let divEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestComponent, DragDropFileUploadDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    divEl = fixture.nativeElement.querySelector('div');
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directive = new DragDropFileUploadDirective();
    expect(directive).toBeTruthy();
  });

  it('should emit fileDropped event on drop', () => {
    spyOn(component, 'onFileDropped');
    const dropEvent = new DragEvent('drop');
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: ['test.txt'] },
    });
    dropEvent.preventDefault = jasmine.createSpy();
    divEl.dispatchEvent(dropEvent);
    fixture.detectChanges();
    expect(component.onFileDropped).toHaveBeenCalledWith(['test.txt']);
  });
});
