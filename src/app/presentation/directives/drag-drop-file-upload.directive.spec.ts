// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropFileUploadDirective } from './drag-drop-file-upload.directive';

const createDragEvent = (type: string, dataTransfer?: any): DragEvent => {
    const event = new Event(type, { bubbles: true, cancelable: true }) as unknown as DragEvent;
    Object.defineProperty(event, 'dataTransfer', {
        value: dataTransfer ?? { files: [], length: 0 },
        writable: false,
    });
    return event;
};

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
        // Arrange
        const dragOverEvent = createDragEvent('dragover');

        // Act
        divEl.dispatchEvent(dragOverEvent);
        fixture.detectChanges();

        // Assert
        expect(divEl.style.backgroundColor).toBe('rgb(226, 238, 253)');
    });

    it('should emit fileDropped event on drop', () => {
        // Arrange
        vi.spyOn(component, 'onFileDropped');
        const dropEvent = createDragEvent('drop', { files: ['file1.txt'], length: 1 });

        // Act
        divEl.dispatchEvent(dropEvent);
        fixture.detectChanges();

        // Assert
        expect(component.onFileDropped).toHaveBeenCalledWith(['file1.txt']);
    });
});
