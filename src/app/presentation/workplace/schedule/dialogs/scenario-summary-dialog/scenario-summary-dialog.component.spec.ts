// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, throwError } from 'rxjs';
import { ScenarioSummaryDialogComponent } from './scenario-summary-dialog.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';

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
