// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, throwError } from 'rxjs';
import { ScenarioSummaryDialogComponent } from './scenario-summary-dialog.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { IScenarioVariantCoverage } from 'src/app/domain/models/schedule/scenario-variant-coverage.interface';
import { CalendarDateToStringShort } from 'src/app/domain/helpers/date.helper';

const TEST_LANGUAGE = 'en';
const EXPENSES_NOTICE_KEY = 'scenarioSummary.expensesWithChangedEmployee';
const EXPENSES_NOTICE_SELECTOR = '#scenario-summary-expenses-changed-employee';

describe('ScenarioSummaryDialogComponent', () => {
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Oktober Variante B' } as IAnalyseScenario;

  const summary: ScenarioSummary = {
    token: 'token-1',
    fromDate: '2026-10-01',
    untilDate: '2026-10-31',
    agentCount: 5,
    workCount: 30,
    demandedSlots: 40,
    filledSlots: 30,
    openSlots: 10,
    shifts: [
      { shiftId: 's-1', shiftName: 'Frueh', abbreviation: 'F', demandedSlots: 20, filledSlots: 20, openSlots: 0 },
      { shiftId: 's-2', shiftName: 'Nacht', abbreviation: 'N', demandedSlots: 20, filledSlots: 10, openSlots: 10 },
    ],
    openSlotReasons: [
      { reasonCode: 'NO_AGENT_PERFORMS_SHIFT_WORK', slotCount: 7, shiftNames: ['Nacht'] },
      { reasonCode: 'SOMETHING_NEW', slotCount: 3, shiftNames: ['Nacht', 'Frueh'] },
    ],
  };

  let loadSummary: ReturnType<typeof vi.fn>;
  let dialog: ScenarioSummaryDialogComponent;

  const modal = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);

  beforeEach(() => {
    loadSummary = vi.fn();
    TestBed.configureTestingModule({
      imports: [ScenarioSummaryDialogComponent, TranslateModule.forRoot()],
      providers: [{ provide: AnalyseScenarioService, useValue: { loadSummary } }],
    });
    const fixture = TestBed.createComponent(ScenarioSummaryDialogComponent);
    fixture.detectChanges();
    dialog = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
  });

  it('loads the summary by scenario id and shows a loading state until it arrives', () => {
    // Arrange
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);

    // Act
    dialog.open(scenario);
    TestBed.tick();

    // Assert
    expect(loadSummary).toHaveBeenCalledWith('scenario-1');
    expect(modal('#scenario-summary-loading')).not.toBeNull();
    expect(modal('#scenario-summary-total')).toBeNull();
  });

  it('shows the total, the coverage per shift and the reasons with their shifts', () => {
    // Arrange
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);
    dialog.open(scenario);

    // Act
    pending.next(summary);
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-name')?.textContent).toContain('Oktober Variante B');
    expect(modal('#scenario-summary-total')?.textContent).toContain('scenarioSummary.total');
    const rows = Array.from(document.querySelectorAll('#scenario-summary-shifts .summary-shift-row'));
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('Nacht');
    expect(rows[1].textContent).toContain('10 / 20');
    const reasons = Array.from(document.querySelectorAll('#scenario-summary-reasons .summary-reason'));
    expect(reasons).toHaveLength(2);
    expect(reasons[0].textContent).toContain('scenarioSummary.reason.NO_AGENT_PERFORMS_SHIFT_WORK');
    expect(reasons[0].textContent).toContain('Nacht');
    expect(reasons[1].textContent).toContain('scenarioSummary.reason.CAPACITY_OR_RULES');
    expect(reasons[1].textContent).toContain('Nacht, Frueh');
  });

  it('shows no reasons section when every slot is filled', () => {
    // Arrange
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);
    dialog.open(scenario);

    // Act
    pending.next({ ...summary, openSlots: 0, filledSlots: 40, openSlotReasons: [] });
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-total')).not.toBeNull();
    expect(modal('#scenario-summary-reasons')).toBeNull();
  });

  it('warns with the count when expenses now sit on a work of another employee', () => {
    // Arrange
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(TEST_LANGUAGE, { [EXPENSES_NOTICE_KEY]: 'Moved: {{count}}' });
    translate.use(TEST_LANGUAGE);
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);
    dialog.open(scenario);

    // Act
    pending.next({ ...summary, expensesWithChangedEmployee: 4 });
    TestBed.tick();

    // Assert
    expect(modal(EXPENSES_NOTICE_SELECTOR)?.textContent?.trim()).toBe('Moved: 4');
  });

  it('shows no moved-expenses warning when the count is zero', () => {
    // Arrange
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);
    dialog.open(scenario);

    // Act
    pending.next({ ...summary, expensesWithChangedEmployee: 0 });
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-total')).not.toBeNull();
    expect(modal(EXPENSES_NOTICE_SELECTOR)).toBeNull();
  });

  it('shows no moved-expenses warning when the backend sends no count', () => {
    // Arrange
    const pending = new Subject<ScenarioSummary>();
    loadSummary.mockReturnValue(pending);
    dialog.open(scenario);

    // Act
    pending.next(summary);
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-total')).not.toBeNull();
    expect(modal(EXPENSES_NOTICE_SELECTOR)).toBeNull();
  });

  describe('coverage per key', () => {
    const translations = {
      'scenarioVariant.summary.covered': '{{filled}} of {{demanded}} filled',
      'scenarioVariant.summary.open': 'Open: {{count}}',
      'scenarioVariant.summary.peak': 'Peak: {{count}} open on {{date}}',
      'scenarioVariant.summary.copiedShifts.one': '{{count}} shift is a copy',
      'scenarioVariant.summary.copiedShifts.other': '{{count}} shifts are copies',
    };

    const winter: IScenarioVariantCoverage = {
      variantId: 'v-1',
      name: 'Winter key',
      demandedSlots: 12,
      filledSlots: 9,
      openSlots: 3,
      peakOpenSlots: 2,
      peakDate: '2026-11-09',
      copiedShiftCount: 3,
    };

    const complete: IScenarioVariantCoverage = {
      variantId: 'v-2',
      name: 'Spring key',
      demandedSlots: 4,
      filledSlots: 4,
      openSlots: 0,
      peakOpenSlots: 0,
      peakDate: null,
      copiedShiftCount: 0,
    };

    const openWith = (variants: IScenarioVariantCoverage[] | undefined): void => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation(TEST_LANGUAGE, translations);
      translate.use(TEST_LANGUAGE);
      const pending = new Subject<ScenarioSummary>();
      loadSummary.mockReturnValue(pending);
      dialog.open(scenario);
      pending.next({ ...summary, variants });
      TestBed.tick();
    };

    const sections = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('#scenario-summary-variants .summary-variant'));

    it('shows one section per key with its name, filled of demanded and open slots', () => {
      openWith([winter, complete]);

      const rows = sections();
      expect(rows).toHaveLength(2);
      expect(rows[0].querySelector('.summary-variant-name')?.textContent?.trim()).toBe('Winter key');
      expect(rows[0].querySelector('.summary-variant-covered')?.textContent?.trim()).toBe('9 of 12 filled');
      expect(rows[0].querySelector('.summary-variant-open')?.textContent?.trim()).toBe('Open: 3');
      expect(rows[1].querySelector('.summary-variant-name')?.textContent?.trim()).toBe('Spring key');
      expect(rows[1].querySelector('.summary-variant-covered')?.textContent?.trim()).toBe('4 of 4 filled');
    });

    it('shows the worst day of a key with its open slots and the date in the display format of the period', () => {
      openWith([winter]);

      const peak = sections()[0].querySelector('.summary-variant-peak')?.textContent?.trim();
      expect(peak).toBe(`Peak: 2 open on ${CalendarDateToStringShort('2026-11-09', TEST_LANGUAGE)}`);
    });

    it('warns on a key holding copies that original and copy both count', () => {
      openWith([winter]);

      const warning = sections()[0].querySelector('.summary-warning');
      expect(warning?.textContent?.trim()).toBe('3 shifts are copies');
      expect(warning?.getAttribute('role')).toBe('alert');
    });

    it('shows a key nothing was planned for with nothing open, and still warns about its copies', () => {
      openWith([{ ...complete, demandedSlots: 0, filledSlots: 0, copiedShiftCount: 2 }]);

      const row = sections()[0];
      expect(row.querySelector('.summary-variant-covered')?.textContent?.trim()).toBe('0 of 0 filled');
      expect(row.querySelector('.summary-variant-open')?.textContent?.trim()).toBe('Open: 0');
      expect(row.querySelector('.summary-variant-open')?.classList.contains('summary-open')).toBe(false);
      expect(row.querySelector('.summary-variant-peak')).toBeNull();
      expect(row.querySelector('.summary-warning')?.textContent?.trim()).toBe('2 shifts are copies');
    });

    it('uses the singular text for one copy', () => {
      openWith([{ ...winter, copiedShiftCount: 1 }]);

      expect(sections()[0].querySelector('.summary-warning')?.textContent?.trim()).toBe('1 shift is a copy');
    });

    it('shows no warning for a key without copies', () => {
      openWith([complete]);

      expect(sections()[0].querySelector('.summary-warning')).toBeNull();
    });

    it('shows no peak line for a key without open slots', () => {
      openWith([complete]);

      expect(sections()[0].querySelector('.summary-variant-peak')).toBeNull();
      expect(sections()[0].querySelector('.summary-variant-open')?.classList.contains('summary-open')).toBe(false);
    });

    it('marks the open slots of a key in the warning colour', () => {
      openWith([winter]);

      expect(sections()[0].querySelector('.summary-variant-open')?.classList.contains('summary-open')).toBe(true);
    });

    it('hides the section when the summary carries no keys', () => {
      openWith(undefined);

      expect(modal('#scenario-summary-total')).not.toBeNull();
      expect(modal('#scenario-summary-variants')).toBeNull();
    });

    it('hides the section when the list of keys is empty', () => {
      openWith([]);

      expect(modal('#scenario-summary-total')).not.toBeNull();
      expect(modal('#scenario-summary-variants')).toBeNull();
    });
  });

  it('says that no summary exists when the backend does not know the scenario', () => {
    // Arrange
    loadSummary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.NotFound })),
    );

    // Act
    dialog.open(scenario);
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-not-found')).not.toBeNull();
    expect(modal('#scenario-summary-failed')).toBeNull();
  });

  it('reports a load failure for any other error', () => {
    // Arrange
    loadSummary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: HttpStatusCode.InternalServerError })),
    );

    // Act
    dialog.open(scenario);
    TestBed.tick();

    // Assert
    expect(modal('#scenario-summary-failed')).not.toBeNull();
    expect(modal('#scenario-summary-not-found')).toBeNull();
  });
});
