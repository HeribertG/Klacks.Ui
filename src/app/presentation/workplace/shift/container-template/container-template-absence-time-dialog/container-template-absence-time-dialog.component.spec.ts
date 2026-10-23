// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ContainerTemplateAbsenceService } from '../services/container-template-absence.service';
import { ContainerTemplateAbsenceTimeDialogComponent } from './container-template-absence-time-dialog.component';

describe('ContainerTemplateAbsenceTimeDialogComponent', () => {
  it('shows the dialog title, dismisses on the close cross and on cancel and closes on save', () => {
    const modal = { close: vi.fn(), dismiss: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ContainerTemplateAbsenceTimeDialogComponent, TranslateModule.forRoot()],
      providers: [{ provide: ContainerTemplateAbsenceService, useValue: { absenceModalTitle: 'Holiday 08:00' } }],
    });
    TestBed.overrideComponent(ContainerTemplateAbsenceTimeDialogComponent, {
      set: { imports: [TranslateModule], schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(ContainerTemplateAbsenceTimeDialogComponent);
    fixture.componentRef.setInput('modal', modal as unknown as NgbActiveModal);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelector('.modal-header .close') as HTMLElement).click();
    (root.querySelector('.modal-footer .link-button') as HTMLElement).click();
    (root.querySelector('.modal-footer .save-btn') as HTMLElement).click();

    expect(root.querySelector('.modal-title')?.textContent?.trim()).toBe('Holiday 08:00');
    expect(modal.dismiss).toHaveBeenCalledTimes(2);
    expect(modal.close).toHaveBeenCalledTimes(1);
  });
});
