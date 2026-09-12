// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AllShiftNavComponent } from './all-shift-nav.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { TranslateService } from '@ngx-translate/core';

describe('AllShiftNavComponent - filter locked to planbar for planers', () => {
  let held: Set<string>;
  let dataManagementShiftService: { currentFilter: { filterType: number } };

  const createComponent = (): AllShiftNavComponent => {
    dataManagementShiftService = { currentFilter: { filterType: 0 } };

    TestBed.configureTestingModule({
      imports: [AllShiftNavComponent],
      providers: [
        { provide: DataManagementShiftService, useValue: dataManagementShiftService },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
        { provide: WorkplaceStateService, useValue: { isFocusChanged: { set: vi.fn() } } },
        { provide: TranslateService, useValue: { currentLang: 'en', onLangChange: of() } },
      ],
    });

    const fixture = TestBed.createComponent(AllShiftNavComponent);
    return fixture.componentInstance;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('forces the filter to planbar (1) for a planer without CanEditShifts', () => {
    const component = createComponent();

    component.ngOnInit();

    expect(dataManagementShiftService.currentFilter.filterType).toBe(1);
  });

  it('leaves the filter untouched for a supervisor with CanEditShifts', () => {
    held.add(PERMISSIONS.CanEditShifts);
    const component = createComponent();

    component.ngOnInit();

    expect(dataManagementShiftService.currentFilter.filterType).toBe(0);
  });
});
