// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PlanningRuleWarningReportComponent } from './planning-rule-warning-report.component';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

const RULE_ID = '6f1c2a54-0000-4000-8000-000000000001';

function invalidRuleWarning(ruleId = RULE_ID): ScheduleErrorEntry {
  return {
    type: 'warning',
    clientId: '00000000-0000-0000-0000-000000000000',
    clientName: '',
    date: '2026-10-01',
    comment: 'schedule.error-list.planning-rule-invalid',
    commentParams: { ruleId },
  };
}

describe('PlanningRuleWarningReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningRuleWarningReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      'schedule.error-list.planning-rule-invalid': 'Planungsregel ungültig',
      'schedule.error-list.planning-rule': 'Regel {{kind}} verletzt',
      'planning-rule-kind.forbiddentransition': 'Unzulässige Dienstfolge',
    });
    translate.use('de');
  });

  function render(warnings: ScheduleErrorEntry[] | null) {
    const fixture = TestBed.createComponent(PlanningRuleWarningReportComponent);
    fixture.componentRef.setInput('warnings', warnings);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing without warnings', () => {
    expect(render([]).querySelector('.planning-rule-warning-report')).toBeNull();
    expect(render(null).querySelector('.planning-rule-warning-report')).toBeNull();
  });

  it('shows the translated text and the rule id only as tooltip', () => {
    const line = render([invalidRuleWarning()]).querySelector('.planning-rule-warning') as HTMLElement;
    expect(line.textContent).toContain('Planungsregel ungültig');
    expect(line.textContent).not.toContain(RULE_ID);
    expect(line.getAttribute('title')).toBe(RULE_ID);
  });

  it('shows one line per warning inside the standard warning alert', () => {
    const host = render([invalidRuleWarning(), invalidRuleWarning('other-rule')]);
    expect(host.querySelector('.alert.alert-warning')).not.toBeNull();
    expect(host.querySelectorAll('.planning-rule-warning').length).toBe(2);
  });

  it('shows the rule kind by its readable name', () => {
    const line = render([
      {
        ...invalidRuleWarning(),
        comment: 'schedule.error-list.planning-rule',
        commentParams: { kind: 'ForbiddenTransition', ruleId: RULE_ID },
      },
    ]).querySelector('.planning-rule-warning') as HTMLElement;
    expect(line.textContent).toContain('Regel Unzulässige Dienstfolge verletzt');
  });
});
