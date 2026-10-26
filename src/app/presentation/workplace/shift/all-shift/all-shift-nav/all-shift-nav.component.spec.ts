// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AllShiftNavComponent } from './all-shift-nav.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { TranslateService } from '@ngx-translate/core';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { ICountry } from 'src/app/domain/models/client/i-country';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';

const country = (abbreviation: string): ICountry => ({
  id: abbreviation,
  abbreviation,
  prefix: '',
  select: true,
  isDirty: 0,
});

const token = (state: string, countryCode: string): StateCountryToken => {
  const result = new StateCountryToken();
  result.id = `${countryCode}-${state}`;
  result.state = state;
  result.country = countryCode;
  return result;
};

const clientConfigStub = () => ({
  countries: signal([country('CH'), country('DE'), country('FR')]),
  stateList: signal([token('BE', 'CH'), token('ZH', 'CH'), token('BE', 'DE'), token('01', 'FR')]),
  isInit: signal(true),
  init: vi.fn(),
});

describe('AllShiftNavComponent - filter locked to planbar for planers', () => {
  let held: Set<string>;
  let dataManagementShiftService: { currentFilter: ShiftFilter; isRead: ReturnType<typeof signal<boolean>> };

  const createComponent = (): AllShiftNavComponent => {
    dataManagementShiftService = { currentFilter: new ShiftFilter(), isRead: signal(false) };

    TestBed.configureTestingModule({
      imports: [AllShiftNavComponent],
      providers: [
        { provide: DataManagementShiftService, useValue: dataManagementShiftService },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
        { provide: WorkplaceStateService, useValue: { isFocusChanged: { set: vi.fn() } } },
        { provide: ClientConfigService, useValue: clientConfigStub() },
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

describe('AllShiftNavComponent - location and validity filter', () => {
  const setup = (prepare?: (filter: ShiftFilter) => void) => {
    const readPage = vi.fn();
    const isFocusChanged = { set: vi.fn() };
    const currentFilter = new ShiftFilter();
    prepare?.(currentFilter);
    const dataManagementShiftService = {
      currentFilter,
      isRead: signal(false),
      readPage,
    };

    TestBed.configureTestingModule({
      imports: [AllShiftNavComponent],
      providers: [
        { provide: DataManagementShiftService, useValue: dataManagementShiftService },
        { provide: AuthorizationService, useValue: { hasPermission: () => true } },
        { provide: WorkplaceStateService, useValue: { isFocusChanged } },
        { provide: ClientConfigService, useValue: clientConfigStub() },
        { provide: TranslateService, useValue: { currentLang: 'en', onLangChange: of() } },
      ],
    });

    const fixture = TestBed.createComponent(AllShiftNavComponent);
    return { component: fixture.componentInstance, readPage, isFocusChanged, filter: currentFilter };
  };

  it('reloads the list with the entered city and zip prefix on select', () => {
    const { component, readPage, isFocusChanged, filter } = setup();
    filter.city = 'Zurich';
    filter.zipPrefix = '80';

    component.onSelect();

    expect(readPage).toHaveBeenCalledTimes(1);
    expect(isFocusChanged.set).toHaveBeenCalledWith(true);
    expect(filter.city).toBe('Zurich');
    expect(filter.zipPrefix).toBe('80');
  });

  it('starts with every country and canton checked and no restriction on the filter', () => {
    const { component, filter } = setup();

    expect(component.isCountrySelected('CH')).toBe(true);
    expect(component.visibleStates().length).toBe(4);
    expect(filter.countries).toEqual([]);
    expect(filter.states).toEqual([]);
  });

  it('writes the checked countries to the filter once one is unchecked', () => {
    const { component, filter } = setup();

    component.onCountryToggle('FR', false);

    expect(filter.countries).toEqual(['CH', 'DE']);
    expect(component.isCountrySelected('FR')).toBe(false);
    expect(component.visibleStates().map((t) => t.country)).not.toContain('FR');
  });

  it('writes the checked cantons as (state, country) pairs and keeps Bern and Berlin apart', () => {
    const { component, filter } = setup();
    const bernInSwitzerland = component.visibleStates()[0];

    component.onStateToggle(bernInSwitzerland, false);

    expect(filter.states).toEqual([
      { state: 'ZH', country: 'CH' },
      { state: 'BE', country: 'DE' },
      { state: '01', country: 'FR' },
    ]);
  });

  it('returns to no restriction once everything is checked again', () => {
    const { component, filter } = setup();

    component.onCountryToggle('FR', false);
    component.onCountryToggle('FR', true);

    expect(filter.countries).toEqual([]);
  });

  it('selects and deselects all countries like the client filter: deselect-all sends no restriction', () => {
    const { component, filter } = setup();
    component.onCountryToggle('FR', false);

    component.selectCountries(false);

    expect(component.isCountrySelected('CH')).toBe(false);
    expect(filter.countries).toEqual([]);

    component.onCountryToggle('DE', true);
    expect(filter.countries).toEqual(['DE']);

    component.selectCountries(true);
    expect(component.isCountrySelected('FR')).toBe(true);
    expect(filter.countries).toEqual([]);
  });

  it('restores the checked entries from a filter that was set before the panel was created', () => {
    const { component } = setup((filter) => {
      filter.countries = ['CH'];
      filter.states = [{ state: 'ZH', country: 'CH' }];
    });

    expect(component.isCountrySelected('CH')).toBe(true);
    expect(component.isCountrySelected('DE')).toBe(false);
    const states = component.visibleStates();
    expect(states.map((t) => component.isStateSelected(t))).toEqual([false, true]);
  });

  it('reloads the list once when a location dropdown closes after a change, not when nothing changed', () => {
    const { component, readPage } = setup();

    component.onLocationDropdownChange(true);
    component.onLocationDropdownChange(false);
    expect(readPage).not.toHaveBeenCalled();

    component.onCountryToggle('DE', false);
    component.onLocationDropdownChange(true);
    expect(readPage).not.toHaveBeenCalled();
    component.onLocationDropdownChange(false);
    expect(readPage).toHaveBeenCalledTimes(1);

    component.onLocationDropdownChange(false);
    expect(readPage).toHaveBeenCalledTimes(1);
  });

  it('takes the validity period from the date pickers into the filter and clears it again', () => {
    const { component, filter } = setup();

    component.onValidFromChange({ year: 2026, month: 3, day: 1 });
    component.onValidUntilChange({ year: 2026, month: 3, day: 31 });

    expect(filter.validFrom).toEqual(new Date(2026, 2, 1));
    expect(filter.validUntil).toEqual(new Date(2026, 2, 31));
    expect(filter.scopeFrom).toBeUndefined();

    component.onValidFromChange(undefined);
    component.onValidUntilChange(undefined);

    expect(filter.validFrom).toBeUndefined();
    expect(filter.validUntil).toBeUndefined();
    expect(filter.isDefault()).toBe(true);
  });

  it('shows the validity period already held by the filter in the date pickers', () => {
    const { component } = setup((filter) => {
      filter.validFrom = new Date(2026, 2, 1);
    });

    expect(component.validFromValue).toEqual({ year: 2026, month: 3, day: 1 });
    expect(component.validUntilValue).toBeUndefined();
  });
});
