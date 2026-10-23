// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlanCriticReportComponent } from './plan-critic-report.component';
import { PlanCriticResult } from 'src/app/domain/models/holistic-harmonizer/plan-critic-result.interface';

const NAMES = ['Anna Muster', 'Beat Beispiel'];

const result = (overrides: Partial<PlanCriticResult> = {}): PlanCriticResult => ({
  status: 'Completed',
  modelId: 'gemini-25-flash',
  findings: [
    {
      pattern: 'night_then_early',
      description: 'r00 hat Nacht und danach Früh.',
      severity: 'High',
      cells: [
        { row: 0, day: 0, symbol: 'N' },
        { row: 0, day: 1, symbol: 'E' },
      ],
    },
  ],
  discardedFindingCount: 0,
  message: null,
  ...overrides,
});

describe('PlanCriticReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanCriticReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      'holisticHarmonizer.critic.title': 'KI-Hinweise',
      'holisticHarmonizer.critic.none': 'Keine Auffälligkeiten',
      'holisticHarmonizer.critic.failed': 'Prüfung fehlgeschlagen',
      'holisticHarmonizer.critic.discarded': '{{count}} verworfen',
      'holisticHarmonizer.critic.model': 'Modell: {{model}}',
      'holisticHarmonizer.critic.severity-high': 'Hoch',
    });
    translate.use('de');
  });

  function render(critic: PlanCriticResult | null) {
    const fixture = TestBed.createComponent(PlanCriticReportComponent);
    fixture.componentRef.setInput('critic', critic);
    fixture.componentRef.setInput('agentDisplayNames', NAMES);
    fixture.componentRef.setInput('periodStart', null);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing without a review or when the critic was skipped', () => {
    expect(render(null).querySelector('.plan-critic-report')).toBeNull();
    expect(render(result({ status: 'Skipped', findings: [] })).querySelector('.plan-critic-report')).toBeNull();
  });

  it('shows findings with agent names instead of row labels', () => {
    const element = render(result());
    const text = element.textContent ?? '';

    expect(element.querySelectorAll('.plan-critic-card')).toHaveLength(1);
    expect(element.querySelector('.plan-critic-card--high')).not.toBeNull();
    expect(text).toContain('Hoch');
    expect(text).toContain('Anna Muster hat Nacht und danach Früh.');
    expect(text).not.toContain('r00');
    expect(text).toContain('Modell: gemini-25-flash');
  });

  it('says nothing was found and reports discarded findings', () => {
    const text = render(result({ findings: [], discardedFindingCount: 2 })).textContent ?? '';

    expect(text).toContain('Keine Auffälligkeiten');
    expect(text).toContain('2 verworfen');
  });

  it('shows a short notice when the critic failed', () => {
    const element = render(result({ status: 'Failed', findings: [], message: 'timeout' }));

    expect(element.textContent).toContain('Prüfung fehlgeschlagen');
    expect(element.querySelector('.plan-critic-card')).toBeNull();
  });
});
