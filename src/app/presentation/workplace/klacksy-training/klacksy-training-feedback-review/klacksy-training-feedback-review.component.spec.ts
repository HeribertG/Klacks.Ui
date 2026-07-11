// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingFeedbackReviewComponent } from './klacksy-training-feedback-review.component';
import { KlacksyTrainingService } from '../../../../core/services/klacksy-training.service';

import { DomainMessages } from 'src/app/domain/constants/messages';
describe('KlacksyTrainingFeedbackReviewComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingFeedbackReviewComponent>;
  let service: { listFeedback: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listFeedback: vi.fn().mockReturnValue(of([{ id: '1', utterance: 'test', locale: 'de', timestamp: '2026-04-14T00:00:00Z' }])) };
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingFeedbackReviewComponent, CommonModule, FormsModule, TranslateModule.forRoot()],
      providers: [{ provide: KlacksyTrainingService, useValue: service }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingFeedbackReviewComponent);
    fixture.detectChanges();
  });

  it('loads feedback on init', () => {
    expect(service.listFeedback).toHaveBeenCalledWith(DomainMessages.DEFAULT_LANG, 50);
    const rows = fixture.nativeElement.querySelectorAll('#klacksyTrainingFeedbackTable tbody tr');
    expect(rows.length).toBe(1);
  });
});
