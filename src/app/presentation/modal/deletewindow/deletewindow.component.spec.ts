/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

import { DeletewindowComponent } from './deletewindow.component';
import { AttentionGreyComponent } from 'src/app/presentation/icons/attention-icon-grey.component';

describe('DeletewindowComponent', () => {
  let component: DeletewindowComponent;
  let fixture: ComponentFixture<DeletewindowComponent>;

  beforeEach(async () => {
    const ngbActiveModalSpy = jasmine.createSpyObj('NgbActiveModal', [
      'close',
      'dismiss'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        DeletewindowComponent,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: NgbActiveModal, useValue: ngbActiveModalSpy }
      ],
    })
    .overrideComponent(DeletewindowComponent, {
      set: {
        imports: [CommonModule, TranslateModule, AttentionGreyComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeletewindowComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default title', () => {
    expect(component.title).toBe('Löschen');
  });

  it('should have empty default message', () => {
    expect(component.message).toBe('');
  });

  it('should accept custom title input', () => {
    const customTitle = 'Benutzer löschen';
    component.title = customTitle;
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('#modal-title');
    expect(titleElement.textContent.trim()).toBe(customTitle);
  });

  it('should accept custom message input', () => {
    const customMessage =
      'Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?';
    component.message = customMessage;
    fixture.detectChanges();

    const modalBody = fixture.nativeElement.querySelector('.modal-body');
    expect(modalBody.textContent.trim()).toContain(customMessage);
  });

  it('should display attention icon', () => {
    fixture.detectChanges();

    const attentionIcon = fixture.nativeElement.querySelector(
      'app-icon-attention-icon-grey'
    );
    expect(attentionIcon).toBeTruthy();
  });

  it('should have proper CSS classes', () => {
    fixture.detectChanges();

    const headerElement = fixture.nativeElement.querySelector('.modal-header');
    const bodyElement = fixture.nativeElement.querySelector('.modal-body');

    expect(headerElement).toBeTruthy();
    expect(headerElement.classList.contains('color-red')).toBe(true);
    expect(bodyElement).toBeTruthy();
    expect(bodyElement.classList.contains('row-line-modal')).toBe(true);
  });

  it('should render template correctly with inputs', () => {
    const testTitle = 'Test Delete Title';
    const testMessage = 'Test delete message';

    component.title = testTitle;
    component.message = testMessage;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('#modal-title').textContent).toContain(
      testTitle
    );
    expect(compiled.querySelector('.modal-body').textContent).toContain(
      testMessage
    );
  });
});
