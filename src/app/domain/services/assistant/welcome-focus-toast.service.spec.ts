// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { WelcomeFocusToastService } from './welcome-focus-toast.service';
import { IWelcomeFocus } from 'src/app/domain/models/assistant/welcome-focus.interface';
import {
  WELCOME_FOCUS_ACTION,
  WELCOME_FOCUS_ACTION_KIND,
  WELCOME_FOCUS_LATER,
} from 'src/app/domain/constants/welcome-focus.constants';

describe('WelcomeFocusToastService', () => {
  const translations: Record<string, string> = {
    'klacksy.focus.period-overdue.prompt':
      'Die Periode bis {{periodEnd}} ({{group}}) ist seit {{days}} Tagen überfällig.',
    'klacksy.focus.period-overdue.action': 'Periode abschliessen',
    'klacksy.focus.next-period.prompt': 'Die nächste Periode beginnt am {{periodStart}}.',
    'klacksy.focus.no-orders.prompt': 'Es gibt noch keine Bestellungen.',
    'setupConsultation.startButton': 'Beratung starten',
    'klacksy.focus.later': 'Später',
    'assistant-chat.action-toast.prompt': 'Was möchtest du tun?',
  };

  const translateMock = {
    currentLang: 'de',
    instant: (key: string, params?: Record<string, string>) => {
      const template = translations[key];
      if (template === undefined) {
        return key;
      }
      return template.replace(/{{(\w+)}}/g, (_match: string, name: string) => params?.[name] ?? '');
    },
  };

  let service: WelcomeFocusToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WelcomeFocusToastService,
        { provide: TranslateService, useValue: translateMock },
      ],
    });
    service = TestBed.inject(WelcomeFocusToastService);
  });

  function periodOverdueFocus(): IWelcomeFocus {
    return {
      kind: 'period_overdue',
      promptKey: 'klacksy.focus.period-overdue.prompt',
      promptParams: { group: 'Nord', periodEnd: '2026-08-31', days: '7' },
      actionKind: WELCOME_FOCUS_ACTION_KIND.Navigate,
      actionLabelKey: 'klacksy.focus.period-overdue.action',
      actionRoute: '/workplace/period-closing',
      conditionId: 'c1',
    };
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('resolves the prompt and formats date slots in dd.MM.yyyy', () => {
    const result = service.build(periodOverdueFocus(), []);

    expect(result.prompt).toBe('Die Periode bis 31.08.2026 (Nord) ist seit 7 Tagen überfällig.');
  });

  it('formats the periodStart slot as well', () => {
    const focus: IWelcomeFocus = {
      kind: 'next_period_scheduling_due',
      promptKey: 'klacksy.focus.next-period.prompt',
      promptParams: { group: 'Ost', periodStart: '2026-10-01', days: '5' },
      actionKind: WELCOME_FOCUS_ACTION_KIND.Navigate,
      actionLabelKey: 'klacksy.focus.next-period.action',
      actionRoute: '/workplace/schedule',
    };

    const result = service.build(focus, []);

    expect(result.prompt).toBe('Die nächste Periode beginnt am 01.10.2026.');
  });

  it('falls back to the neutral prompt when the translation is missing', () => {
    const focus = periodOverdueFocus();
    focus.promptKey = 'klacksy.focus.does-not-exist.prompt';

    const result = service.build(focus, []);

    expect(result.prompt).toBe('Was möchtest du tun?');
  });

  it('puts the focus action first, the ranked options next and later last', () => {
    const ranked = [
      { label: 'Mitarbeiter anlegen', value: '/workplace/new-employee' },
      { label: 'Person finden', value: '/workplace/client' },
    ];

    const result = service.build(periodOverdueFocus(), ranked);

    expect(result.options.map((option) => option.value)).toEqual([
      WELCOME_FOCUS_ACTION,
      '/workplace/new-employee',
      '/workplace/client',
      WELCOME_FOCUS_LATER,
    ]);
    expect(result.options[0].label).toBe('Periode abschliessen');
    expect(result.options[3].label).toBe('Später');
  });

  it('drops a ranked option that points at the focus route', () => {
    const ranked = [
      { label: 'Periodenabschluss', value: '/workplace/period-closing' },
      { label: 'Person finden', value: '/workplace/client' },
    ];

    const result = service.build(periodOverdueFocus(), ranked);

    expect(result.options.map((option) => option.value)).toEqual([
      WELCOME_FOCUS_ACTION,
      '/workplace/client',
      WELCOME_FOCUS_LATER,
    ]);
  });

  it('keeps every ranked option when the focus carries no route', () => {
    const focus: IWelcomeFocus = {
      kind: 'no_schedule_yet',
      promptKey: 'klacksy.focus.no-orders.prompt',
      promptParams: {},
      actionKind: WELCOME_FOCUS_ACTION_KIND.Consultation,
      actionLabelKey: 'setupConsultation.startButton',
      actionRoute: null,
    };
    const ranked = [{ label: 'Person finden', value: '/workplace/client' }];

    const result = service.build(focus, ranked);

    expect(result.options.map((option) => option.value)).toEqual([
      WELCOME_FOCUS_ACTION,
      '/workplace/client',
      WELCOME_FOCUS_LATER,
    ]);
    expect(result.options[0].label).toBe('Beratung starten');
  });

  it('leaves a non-iso slot value untouched', () => {
    const focus = periodOverdueFocus();
    focus.promptParams = { group: 'Nord', periodEnd: 'irgendwann', days: '7' };

    const result = service.build(focus, []);

    expect(result.prompt).toBe('Die Periode bis irgendwann (Nord) ist seit 7 Tagen überfällig.');
  });

  it('nextLocalMidnightUtc returns the next local midnight as an ISO instant', () => {
    const now = new Date(2026, 8, 8, 14, 30, 0);
    const expected = new Date(2026, 8, 9, 0, 0, 0, 0).toISOString();

    expect(service.nextLocalMidnightUtc(now)).toBe(expected);
  });

  it('nextLocalMidnightUtc stays on the next day just before midnight', () => {
    const now = new Date(2026, 8, 8, 23, 59, 59);
    const expected = new Date(2026, 8, 9, 0, 0, 0, 0).toISOString();

    expect(service.nextLocalMidnightUtc(now)).toBe(expected);
  });
});
