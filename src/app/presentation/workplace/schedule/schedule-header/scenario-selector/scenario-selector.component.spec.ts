// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ScenarioSelectorComponent } from './scenario-selector.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { CreateScenarioDialogComponent } from '../../dialogs/create-scenario-dialog/create-scenario-dialog.component';
import { RenameScenarioDialogComponent } from '../../dialogs/rename-scenario-dialog/rename-scenario-dialog.component';
import { DeleteAllScenariosDialogComponent } from '../../dialogs/delete-all-scenarios-dialog/delete-all-scenarios-dialog.component';
import { ScenarioVariantsDialogComponent } from '../../dialogs/scenario-variants-dialog/scenario-variants-dialog.component';
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

  it('opens the variants dialog from its menu', () => {
    // Arrange
    const open = vi.fn();
    Object.assign(component, { scenarioVariantsDialog: () => ({ open }) });

    // Act
    component.onManageVariants();

    // Assert
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('exposes the shared decision right to its template', () => {
    // Arrange
    actions.canDecide.set(false);

    // Assert
    expect(component.canDecide()).toBe(false);
  });
});

describe('ScenarioSelectorComponent - accept and reject in the menu', () => {
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Plan A' } as IAnalyseScenario;

  let canDecide: WritableSignal<boolean>;
  let canAccept: WritableSignal<boolean>;
  let actions: {
    canDecide: WritableSignal<boolean>;
    canAccept: WritableSignal<boolean>;
    confirmAccept: ReturnType<typeof vi.fn>;
    confirmReject: ReturnType<typeof vi.fn>;
    exit: ReturnType<typeof vi.fn>;
  };

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(ScenarioSelectorComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const item = (host: HTMLElement, id: string): HTMLButtonElement | null =>
    host.querySelector<HTMLButtonElement>(`#${id}`);

  beforeEach(() => {
    canDecide = signal(true);
    canAccept = signal(true);
    actions = { canDecide, canAccept, confirmAccept: vi.fn(), confirmReject: vi.fn(), exit: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ScenarioSelectorComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AnalyseScenarioService,
          useValue: {
            activeScenario: signal<IAnalyseScenario | null>(scenario),
            isScenarioMode: () => true,
            scenarios: signal<IAnalyseScenario[]>([scenario]),
            loadScenarios: vi.fn(),
          },
        },
        { provide: DataManagementScheduleService, useValue: { workFilter: { selectedGroup: undefined } } },
        { provide: ScenarioActionsService, useValue: actions },
      ],
    });
    TestBed.overrideComponent(ScenarioSelectorComponent, {
      remove: {
        imports: [
          CreateScenarioDialogComponent,
          RenameScenarioDialogComponent,
          DeleteAllScenariosDialogComponent,
          ScenarioVariantsDialogComponent,
        ],
      },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  it('enables accept for a user who may accept', () => {
    // Act
    const host = render();
    const accept = item(host, 'scenario-selector-accept-item')!;

    // Assert
    expect(accept.disabled).toBe(false);
    expect(host.querySelector('#scenario-selector-accept-wrap')!.hasAttribute('title')).toBe(false);
  });

  it('disables accept and explains why in the title of its wrapper when the user may decide but not accept, and keeps reject', () => {
    // Arrange
    canAccept.set(false);

    // Act
    const host = render();
    const accept = item(host, 'scenario-selector-accept-item')!;

    // Assert
    expect(accept.disabled).toBe(true);
    expect(host.querySelector('#scenario-selector-accept-wrap')!.getAttribute('title')).toBe('scenarioVariant.accept.needsShiftRight');
    expect(item(host, 'scenario-selector-reject-item')).not.toBeNull();
  });

  it('shows neither accept nor reject to a user who may not decide', () => {
    // Arrange
    canDecide.set(false);
    canAccept.set(false);

    // Act
    const host = render();

    // Assert
    expect(item(host, 'scenario-selector-accept-item')).toBeNull();
    expect(item(host, 'scenario-selector-reject-item')).toBeNull();
  });
});
