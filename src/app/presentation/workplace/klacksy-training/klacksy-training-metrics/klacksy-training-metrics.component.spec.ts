// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingMetricsComponent } from './klacksy-training-metrics.component';
import { KlacksyTrainingService } from '../../../../core/services/klacksy-training.service';

describe('KlacksyTrainingMetricsComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingMetricsComponent>;
  let service: { listTargets: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listTargets: vi.fn().mockReturnValue(of([
      { targetId: 'a', route: '/', labelKey: 'l', synonyms: {}, synonymStatus: 'pending', obsolete: false },
      { targetId: 'b', route: '/', labelKey: 'l', synonyms: {}, synonymStatus: 'reviewed', obsolete: false }
    ])) };
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingMetricsComponent, TranslateModule.forRoot()],
      providers: [{ provide: KlacksyTrainingService, useValue: service }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingMetricsComponent);
    fixture.detectChanges();
  });

  it('computes counts from targets', () => {
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items[0].textContent).toContain('Total: 2');
    expect(items[1].textContent).toContain('Pending: 1');
    expect(items[3].textContent).toContain('Reviewed: 1');
  });
});
