// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingReviewComponent } from './klacksy-training-review.component';
import { KlacksyTrainingService } from '../../../../core/services/klacksy-training.service';

describe('KlacksyTrainingReviewComponent', () => {
  let service: { listTargets: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<KlacksyTrainingReviewComponent>;

  beforeEach(() => {
    service = { listTargets: vi.fn().mockReturnValue(of([{ targetId: 'x', route: '/', labelKey: 'l', synonyms: {}, synonymStatus: 'pending', obsolete: false }])) };
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingReviewComponent, TranslateModule.forRoot()],
      providers: [{ provide: KlacksyTrainingService, useValue: service }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingReviewComponent);
    fixture.detectChanges();
  });

  it('loads targets on init', () => {
    expect(service.listTargets).toHaveBeenCalled();
    const items = fixture.nativeElement.querySelectorAll('.target-list li');
    expect(items.length).toBe(1);
  });
});
