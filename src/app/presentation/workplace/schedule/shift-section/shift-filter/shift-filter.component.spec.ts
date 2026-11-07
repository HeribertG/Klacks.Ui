// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ShiftFilterComponent } from './shift-filter.component';

const DEBOUNCE_MS = 300;

interface ShiftScheduleFilterStub {
  searchString?: string;
  isSporadic: boolean;
  isTimeRange: boolean;
  container: boolean;
  isStandartShift: boolean;
  showUngroupedShifts: boolean;
}

describe('ShiftFilterComponent', () => {
  let fixture: ComponentFixture<ShiftFilterComponent>;
  let filter: ShiftScheduleFilterStub;
  let searchStringsAtReload: (string | undefined)[];

  const searchInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('#shift-filter-search');

  const type = (text: string): void => {
    const input = searchInput();
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  const pressEnter = (): void => {
    searchInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  };

  const createComponent = async (initialSearch?: string): Promise<void> => {
    filter = {
      searchString: initialSearch,
      isSporadic: true,
      isTimeRange: true,
      container: true,
      isStandartShift: true,
      showUngroupedShifts: false,
    };
    searchStringsAtReload = [];
    const dataManagement = {
      shiftScheduleFilter: filter,
      readShiftSchedule: vi.fn(() => searchStringsAtReload.push(filter.searchString)),
    };

    await TestBed.configureTestingModule({
      imports: [ShiftFilterComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataManagementScheduleService, useValue: dataManagement }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftFilterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reloads once with the typed search string when Enter comes within the debounce delay', async () => {
    await createComponent();

    type('Messe');
    pressEnter();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(searchStringsAtReload).toEqual(['Messe']);
  });

  it('reloads once with the typed search string when Enter comes after the debounce delay', async () => {
    await createComponent();

    type('Messe');
    vi.advanceTimersByTime(DEBOUNCE_MS);
    pressEnter();

    expect(searchStringsAtReload).toEqual(['Messe']);
  });

  it('reloads once without a search string when the field is cleared and Enter follows immediately', async () => {
    await createComponent('Messe');

    type('');
    pressEnter();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(searchStringsAtReload).toEqual([undefined]);
  });

  it('reloads without a search string once the cleared value is debounced', async () => {
    await createComponent('Messe');

    type('');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(searchStringsAtReload).toEqual([undefined]);
  });
});
