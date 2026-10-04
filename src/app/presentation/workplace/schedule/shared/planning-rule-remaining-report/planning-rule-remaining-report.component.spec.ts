// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlanningRuleRemainingReportComponent } from './planning-rule-remaining-report.component';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';

describe('PlanningRuleRemainingReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningRuleRemainingReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      'schedule.planning-rule-remaining.pre-existing': '{{count}} vorbestehend',
      'schedule.planning-rule-remaining.added': 'hinzugefügt {{before}} -> {{after}}',
    });
    translate.use('de');
  });

  function render(remaining: PlanningRuleRemaining | null) {
    const fixture = TestBed.createComponent(PlanningRuleRemainingReportComponent);
    fixture.componentRef.setInput('remaining', remaining);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing without a result or without remaining violations', () => {
    expect(render(null).querySelector('.planning-rule-remaining-report')).toBeNull();
    expect(render({ hardBefore: 2, hardAfter: 0 }).querySelector('.planning-rule-remaining-report')).toBeNull();
  });

  it('announces remaining violations as pre-existing', () => {
    const text = render({ hardBefore: 3, hardAfter: 2 }).textContent ?? '';
    expect(text).toContain('2 vorbestehend');
  });

  it('says the run added violations when the count rose', () => {
    const text = render({ hardBefore: 1, hardAfter: 4 }).textContent ?? '';
    expect(text).toContain('hinzugefügt 1 -> 4');
  });
});
