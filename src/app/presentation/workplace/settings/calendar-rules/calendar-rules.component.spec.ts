// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { CalendarRulesComponent } from './calendar-rules.component';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { CalendarRule } from 'src/app/domain/models/calendar/calendar-rule-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';

const BADGE_SELECTOR = '.grid-status-badge';
const BADGE_KEY = 'setting.holiday-rules.unofficial';
const BADGE_HINT_KEY = 'setting.holiday-rules.unofficial-hint';
const ROW_COUNT = 2;

function buildRule(id: string, name: string, isMandatory: boolean): CalendarRule {
  const rule = new CalendarRule();
  rule.id = id;
  rule.name = { de: name, en: name, fr: name, it: name } as MultiLanguage;
  rule.description = { de: '', en: '', fr: '', it: '' } as MultiLanguage;
  rule.country = 'CH';
  rule.state = 'ZH';
  rule.isMandatory = isMandatory;
  return rule;
}

describe('CalendarRulesComponent unofficial badge', () => {
  let fixture: ComponentFixture<CalendarRulesComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    const dataServiceStub = {
      init: vi.fn(),
      readPage: vi.fn(),
      isRead: signal(false),
      isPageRead: signal(false),
      currentFilter: {},
      listWrapper: {
        calendarRules: [
          buildRule('rule-official', 'Neujahr', true),
          buildRule('rule-unofficial', 'Heiligabend', false),
        ],
      },
    };

    await TestBed.configureTestingModule({
      imports: [CalendarRulesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementCalendarRulesService, useValue: dataServiceStub },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      [BADGE_KEY]: 'Inoffiziell',
      [BADGE_HINT_KEY]: 'Kein gesetzlicher Feiertag',
    });
    translate.use('de');

    fixture = TestBed.createComponent(CalendarRulesComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders one row per rule', () => {
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(ROW_COUNT);
  });

  it('shows no badge for a mandatory (statutory) rule', () => {
    const cell = element.querySelector('#calendar-rules-cell-name-0') as HTMLElement;
    expect(cell.textContent).toContain('Neujahr');
    expect(cell.querySelector(BADGE_SELECTOR)).toBeNull();
  });

  it('shows the badge for a non-mandatory (unofficial) rule', () => {
    const cell = element.querySelector('#calendar-rules-cell-name-1') as HTMLElement;
    const badge = cell.querySelector(BADGE_SELECTOR) as HTMLElement;
    expect(cell.textContent).toContain('Heiligabend');
    expect(badge).not.toBeNull();
    expect(badge.textContent?.trim()).toBe('Inoffiziell');
  });

  it('shows only one badge in total', () => {
    expect(element.querySelectorAll(BADGE_SELECTOR).length).toBe(1);
  });

  it('shows the explanatory tooltip on hover', () => {
    const badge = element.querySelector(BADGE_SELECTOR) as HTMLElement;
    badge.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    const tooltip = document.querySelector('ngb-tooltip-window');
    expect(tooltip?.textContent).toContain('Kein gesetzlicher Feiertag');
  });
});

describe('CalendarRulesComponent mixed-case locale', () => {
  let fixture: ComponentFixture<CalendarRulesComponent>;
  let component: CalendarRulesComponent;
  let element: HTMLElement;

  function buildLocalizedRule(): CalendarRule {
    const rule = new CalendarRule();
    rule.id = 'rule-localized';
    rule.name = { de: 'Neujahr', en: 'New Year', 'zh-cn': '元旦', 'zh-tw': '元旦（繁）' } as MultiLanguage;
    rule.description = { de: 'Erster Tag', en: 'First day', 'zh-cn': '一月一日', 'zh-tw': '一月一日（繁）' } as MultiLanguage;
    rule.country = 'CH';
    rule.state = 'ZH';
    rule.isMandatory = true;
    return rule;
  }

  async function setup(locale: string): Promise<void> {
    const dataServiceStub = {
      init: vi.fn(),
      readPage: vi.fn(),
      isRead: signal(false),
      isPageRead: signal(false),
      currentFilter: {},
      filteredRulesToken: [],
      listWrapper: { calendarRules: [buildLocalizedRule()] },
    };

    await TestBed.configureTestingModule({
      imports: [CalendarRulesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementCalendarRulesService, useValue: dataServiceStub },
        { provide: ManualLoaderService, useValue: { loadManual: () => of('') } },
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).use(locale);
    vi.spyOn(TestBed.inject(NgbModal), 'open').mockReturnValue({
      result: new Promise<never>(() => undefined),
    } as unknown as NgbModalRef);

    fixture = TestBed.createComponent(CalendarRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the plugin-language name and description for zh-CN (zh-cn key)', async () => {
    await setup('zh-CN');

    const name = element.querySelector('#calendar-rules-cell-name-0') as HTMLElement;
    const description = element.querySelector('#calendar-rules-cell-description-0') as HTMLElement;
    expect(name.textContent).toContain('元旦');
    expect(name.textContent).not.toContain('New Year');
    expect(description.textContent).toContain('一月一日');
  });

  it('renders the plugin-language name for zh-TW (zh-tw key)', async () => {
    await setup('zh-TW');

    const name = element.querySelector('#calendar-rules-cell-name-0') as HTMLElement;
    expect(name.textContent).toContain('元旦（繁）');
  });

  it('loads the current-language values into the edit form for zh-CN', async () => {
    await setup('zh-CN');

    component.onEditRule(null, buildLocalizedRule());

    expect(component.ruleFormModel().name).toBe('元旦');
    expect(component.ruleFormModel().description).toBe('一月一日');
  });

  it('writes edits into the lower-case key and preserves the other languages', async () => {
    await setup('zh-CN');
    component.onEditRule(null, buildLocalizedRule());
    fixture.detectChanges();

    component.ruleFormModel.update((m) => ({ ...m, name: '新年', description: '新的一天' }));
    fixture.detectChanges();

    expect(component.currentRule.name!['zh-cn']).toBe('新年');
    expect(component.currentRule.description!['zh-cn']).toBe('新的一天');
    expect(component.currentRule.name!['zh-CN']).toBeUndefined();
    expect(component.currentRule.name!.de).toBe('Neujahr');
  });
});
