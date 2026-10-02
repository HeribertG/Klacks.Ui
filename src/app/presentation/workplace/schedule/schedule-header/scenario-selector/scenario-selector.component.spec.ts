// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ScenarioSelectorComponent } from './scenario-selector.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScenarioActionsService } from '../../services/scenario-actions.service';

describe('ScenarioSelectorComponent - decisions go through the shared scenario actions', () => {
  let actions: {
    canDecide: ReturnType<typeof signal<boolean>>;
    confirmAccept: ReturnType<typeof vi.fn>;
    confirmReject: ReturnType<typeof vi.fn>;
    exit: ReturnType<typeof vi.fn>;
  };
  let component: ScenarioSelectorComponent;

  beforeEach(() => {
    actions = { canDecide: signal(true), confirmAccept: vi.fn(), confirmReject: vi.fn(), exit: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyseScenarioService, useValue: { activeScenario: () => null } },
        { provide: DataManagementScheduleService, useValue: { workFilter: { selectedGroup: undefined } } },
        { provide: ScenarioActionsService, useValue: actions },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ScenarioSelectorComponent());
  });

  it('asks for confirmation through the shared flow when accepting', () => {
    // Act
    component.onAccept();

    // Assert
    expect(actions.confirmAccept).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation through the shared flow when rejecting', () => {
    // Act
    component.onReject();

    // Assert
    expect(actions.confirmReject).toHaveBeenCalledTimes(1);
  });

  it('returns to the original through the shared flow', () => {
    // Act
    component.onExitScenario();

    // Assert
    expect(actions.exit).toHaveBeenCalledTimes(1);
  });

  it('exposes the shared decision right to its template', () => {
    // Arrange
    actions.canDecide.set(false);

    // Assert
    expect(component.canDecide()).toBe(false);
  });
});
