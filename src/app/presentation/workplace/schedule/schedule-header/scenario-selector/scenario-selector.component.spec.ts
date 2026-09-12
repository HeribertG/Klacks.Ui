// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ScenarioSelectorComponent } from './scenario-selector.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';

describe('ScenarioSelectorComponent - blocked accept offers the override only to admin or supervisor', () => {
  let held: Set<string>;
  let modalService: { openModal: ReturnType<typeof vi.fn> };
  let toastShowService: { showError: ReturnType<typeof vi.fn> };
  let component: ScenarioSelectorComponent;

  const scenario = { id: 'scenario-1', token: 'token-1' } as IAnalyseScenario;

  const createComponent = (): ScenarioSelectorComponent => {
    modalService = { openModal: vi.fn() };
    toastShowService = { showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AnalyseScenarioService,
          useValue: {
            activeScenario: () => scenario,
            acceptScenario: vi.fn().mockReturnValue(
              throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'blocked' } })),
            ),
          },
        },
        { provide: DataManagementScheduleService, useValue: { workFilter: { selectedGroup: undefined } } },
        { provide: ModalService, useValue: modalService },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission: (permission: string) => held.has(permission),
            hasAnyPermission: (...permissions: string[]) => permissions.some((p) => held.has(p)),
          },
        },
        { provide: ToastShowService, useValue: toastShowService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });

    return TestBed.runInInjectionContext(() => new ScenarioSelectorComponent());
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('shows a plain error toast to a planer instead of an override option', () => {
    component = createComponent();

    component.onAccept();

    expect(modalService.openModal).not.toHaveBeenCalled();
    expect(toastShowService.showError).toHaveBeenCalledWith('blocked');
  });

  it('offers the confirmed override to a supervisor', () => {
    held.add(ROLE_AUTHORISED);
    component = createComponent();

    component.onAccept();

    expect(modalService.openModal).toHaveBeenCalled();
    expect(toastShowService.showError).not.toHaveBeenCalled();
  });

  it('offers the confirmed override to an admin', () => {
    held.add(ROLE_ADMIN);
    component = createComponent();

    component.onAccept();

    expect(modalService.openModal).toHaveBeenCalled();
    expect(toastShowService.showError).not.toHaveBeenCalled();
  });
});
