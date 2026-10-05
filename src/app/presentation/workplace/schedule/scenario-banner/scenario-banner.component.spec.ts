// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ScenarioBannerComponent } from './scenario-banner.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioActionsService } from '../services/scenario-actions.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';

describe('ScenarioBannerComponent', () => {
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
    shifts: [{ shiftId: 's-1', shiftName: 'Nacht', abbreviation: 'N', demandedSlots: 40, filledSlots: 30, openSlots: 10 }],
    openSlotReasons: [{ reasonCode: 'NO_AGENT_WORKS_ON_WEEKDAY', slotCount: 10, shiftNames: ['Nacht'] }],
  };

  let activeScenario: WritableSignal<IAnalyseScenario | null>;
  let loadSummary: ReturnType<typeof vi.fn>;
  let canDecide: WritableSignal<boolean>;
  let actions: {
    canDecide: WritableSignal<boolean>;
    confirmAccept: ReturnType<typeof vi.fn>;
    confirmReject: ReturnType<typeof vi.fn>;
    exit: ReturnType<typeof vi.fn>;
  };

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(ScenarioBannerComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const button = (host: HTMLElement, id: string): HTMLButtonElement | null =>
    host.querySelector<HTMLButtonElement>(`#${id}`);

  beforeEach(() => {
    activeScenario = signal<IAnalyseScenario | null>(scenario);
    canDecide = signal(true);
    loadSummary = vi.fn().mockReturnValue(of(summary));
    actions = { canDecide, confirmAccept: vi.fn(), confirmReject: vi.fn(), exit: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ScenarioBannerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AnalyseScenarioService, useValue: { activeScenario, loadSummary } },
        { provide: ScenarioActionsService, useValue: actions },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
  });

  it('names the active scenario and states that the original plan stays unchanged', () => {
    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#scenario-banner')).not.toBeNull();
    expect(host.querySelector('#scenario-banner-name')?.textContent).toContain('Oktober Variante B');
    expect(host.textContent).toContain('scenario.banner.hint');
  });

  it('renders nothing while no scenario is active', () => {
    // Arrange
    activeScenario.set(null);

    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#scenario-banner')).toBeNull();
  });

  it('delegates accept, reject and back-to-original to the shared scenario actions', () => {
    // Arrange
    const host = render();

    // Act
    button(host, 'scenario-banner-accept-btn')!.click();
    button(host, 'scenario-banner-reject-btn')!.click();
    button(host, 'scenario-banner-exit-btn')!.click();

    // Assert
    expect(actions.confirmAccept).toHaveBeenCalledTimes(1);
    expect(actions.confirmReject).toHaveBeenCalledTimes(1);
    expect(actions.exit).toHaveBeenCalledTimes(1);
  });

  it('offers reject as an icon-only button with an accessible name and tooltip from the translation key', () => {
    // Act
    const host = render();
    const rejectButton = button(host, 'scenario-banner-reject-btn')!;

    // Assert
    expect(rejectButton.querySelector('app-icon-trash-red')).not.toBeNull();
    expect(rejectButton.textContent?.trim()).toBe('');
    expect(rejectButton.getAttribute('aria-label')).toBe('scenario.reject');
    expect(rejectButton.getAttribute('title')).toBe('scenario.reject');
  });

  it('hides accept and reject from a user who may not decide, but keeps back-to-original', () => {
    // Arrange
    canDecide.set(false);

    // Act
    const host = render();

    // Assert
    expect(button(host, 'scenario-banner-accept-btn')).toBeNull();
    expect(button(host, 'scenario-banner-reject-btn')).toBeNull();
    expect(button(host, 'scenario-banner-exit-btn')).not.toBeNull();
  });

  it('loads the summary of the active scenario by its id and shows it in a dialog', () => {
    // Arrange
    const host = render();

    // Act
    button(host, 'scenario-banner-summary-btn')!.click();
    TestBed.tick();

    // Assert
    expect(loadSummary).toHaveBeenCalledTimes(1);
    expect(loadSummary).toHaveBeenCalledWith('scenario-1');
    expect(document.querySelector('#scenario-summary-total')?.textContent).toContain('scenarioSummary.total');
    expect(document.querySelector('#scenario-summary-shifts')?.textContent).toContain('Nacht');
    expect(document.querySelector('#scenario-summary-reasons')?.textContent).toContain(
      'scenarioSummary.reason.NO_AGENT_WORKS_ON_WEEKDAY',
    );
  });

  it('offers the summary even to a user who may not decide', () => {
    // Arrange
    canDecide.set(false);

    // Act
    const host = render();

    // Assert
    expect(button(host, 'scenario-banner-summary-btn')).not.toBeNull();
  });

  it('loads nothing before the summary button is used', () => {
    // Act
    render();

    // Assert
    expect(loadSummary).not.toHaveBeenCalled();
  });
});
