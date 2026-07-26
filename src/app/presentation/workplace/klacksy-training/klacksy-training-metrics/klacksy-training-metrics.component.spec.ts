// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingMetricsComponent } from './klacksy-training-metrics.component';
import { DataKlacksyTrainingService } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';

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
      providers: [{ provide: DataKlacksyTrainingService, useValue: service }]
    });
    fixture = TestBed.createComponent(KlacksyTrainingMetricsComponent);
    fixture.detectChanges();
  });

  it('computes counts from targets', () => {
    const totalCell = fixture.nativeElement.querySelector('#klacksy-training-metrics-row-total td.cell-right');
    const pendingCell = fixture.nativeElement.querySelector('#klacksy-training-metrics-row-pending td.cell-right');
    const reviewedCell = fixture.nativeElement.querySelector('#klacksy-training-metrics-row-reviewed td.cell-right');
    expect(totalCell.textContent.trim()).toBe('2');
    expect(pendingCell.textContent.trim()).toBe('1');
    expect(reviewedCell.textContent.trim()).toBe('1');
  });
});
