// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { KlacksyTrainingReviewHomeComponent } from './klacksy-training-review-home.component';
import { DataKlacksyTrainingService } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';

describe('KlacksyTrainingReviewHomeComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingReviewHomeComponent>;

  // Stub the training service so the rendered tab children (review/feedback/metrics) never make real HTTP
  // calls in their ngOnInit. Without this the spec leaks fetches to /admin/klacksy-training/* which pollute
  // the worker and fail unrelated tests downstream.
  const trainingServiceStub = {
    listTargets: () => of([]),
    listFeedback: () => of([]),
    updateSynonyms: () => of(true),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingReviewHomeComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataKlacksyTrainingService, useValue: trainingServiceStub }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingReviewHomeComponent);
  });

  it('switches tab when nav-link clicked', () => {
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = fixture.nativeElement.querySelectorAll('#klacksy-training-tabs .nav-link');
    links[1].click();
    fixture.detectChanges();
    expect(links[1].classList.contains('active')).toBe(true);
  });
});
