// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { AllShiftListComponent } from './all-shift-list.component';
import { DataProactiveAttributionService } from 'src/app/infrastructure/api/assistant/data-proactive-attribution.service';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AllShiftStateService } from '../services/all-shift-state.service';
import { ShiftTableResizeService } from 'src/app/presentation/services/shift-table-resize.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';

describe('AllShiftListComponent - onClickInfo', () => {
  let component: AllShiftListComponent;
  let fixture: ComponentFixture<AllShiftListComponent>;
  let mockNavigationService: any;
  let mockAllShiftStateService: any;

  beforeEach(() => {
    mockNavigationService = {
      navigateToEditShift: vi.fn(),
    };
    mockAllShiftStateService = {
      saveCurrentFilter: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AllShiftListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementShiftService, useValue: {} },
        { provide: DataManagementShiftCutService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
        { provide: ModalService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: DataShiftService, useValue: {} },
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    }).overrideComponent(AllShiftListComponent, {
      set: {
        providers: [
          { provide: AllShiftStateService, useValue: mockAllShiftStateService },
          { provide: ShiftTableResizeService, useValue: {} },
          { provide: TableSortingService, useValue: {} },
        ],
      },
    });

    fixture = TestBed.createComponent(AllShiftListComponent);
    component = fixture.componentInstance;
  });

  it('saves the current filter and navigates to the edit-shift page in readonly mode', () => {
    const shift = new Shift();
    shift.id = 'shift-1';

    component.onClickInfo(shift);

    expect(mockAllShiftStateService.saveCurrentFilter).toHaveBeenCalled();
    expect(mockNavigationService.navigateToEditShift).toHaveBeenCalledWith('shift-1', true);
  });

  // Pins the order, not just the absence of a throw: saveCurrentFilter reaches into another service,
  // and running it first would skip the takeUntil teardown below whenever it fails.
  it('releases its own subscriptions before reaching into the state service on destroy', () => {
    const order: string[] = [];
    (component as any).destroy$.subscribe(() => order.push('teardown'));
    mockAllShiftStateService.saveCurrentFilter = vi.fn(() => order.push('save'));

    component.ngOnDestroy();

    expect(order).toEqual(['teardown', 'save']);
  });

  it('does nothing when the shift has no id', () => {
    const shift = new Shift();

    component.onClickInfo(shift);

    expect(mockNavigationService.navigateToEditShift).not.toHaveBeenCalled();
    expect(mockAllShiftStateService.saveCurrentFilter).not.toHaveBeenCalled();
  });
});

describe('AllShiftListComponent - readProactiveAttributions', () => {
  let component: AllShiftListComponent;
  let fixture: ComponentFixture<AllShiftListComponent>;
  let mockShiftService: any;
  let mockAttributionService: any;
  let pending: Subject<IProactiveShiftAttribution[]>[];

  const attribution = (entityId: string): IProactiveShiftAttribution => ({
    entityId,
    handledAtUtc: '2026-08-26T10:00:00Z',
    triggerKind: 'empty_container',
  });

  const load = () => (component as any).readProactiveAttributions();

  beforeEach(() => {
    pending = [];
    mockShiftService = {
      currentFilter: { filterType: ShiftFilterType.Container },
      shifts: [{ id: 'container-1' }, { id: undefined }],
    };
    mockAttributionService = {
      getByEntityIds: vi.fn(() => {
        const subject = new Subject<IProactiveShiftAttribution[]>();
        pending.push(subject);
        return subject.asObservable();
      }),
    };

    TestBed.configureTestingModule({
      imports: [AllShiftListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementShiftService, useValue: mockShiftService },
        { provide: DataManagementShiftCutService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
        { provide: ModalService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: DataShiftService, useValue: {} },
        { provide: NavigationService, useValue: {} },
        { provide: DataProactiveAttributionService, useValue: mockAttributionService },
      ],
    }).overrideComponent(AllShiftListComponent, {
      set: {
        providers: [
          { provide: AllShiftStateService, useValue: { saveCurrentFilter: vi.fn() } },
          { provide: ShiftTableResizeService, useValue: {} },
          { provide: TableSortingService, useValue: {} },
        ],
      },
    });

    fixture = TestBed.createComponent(AllShiftListComponent);
    component = fixture.componentInstance;
  });

  it('asks only for shifts that actually carry an id', () => {
    load();

    expect(mockAttributionService.getByEntityIds).toHaveBeenCalledWith(['container-1']);
  });

  it('keys the loaded attributions by entity id', () => {
    load();
    pending[0].next([attribution('container-1')]);

    expect(component.proactiveAttributions().get('container-1')?.triggerKind).toBe('empty_container');
  });

  it('clears the map and asks nothing outside the container view', () => {
    load();
    pending[0].next([attribution('container-1')]);
    mockShiftService.currentFilter.filterType = ShiftFilterType.Shift;

    load();

    expect(component.proactiveAttributions().size).toBe(0);
    expect(mockAttributionService.getByEntityIds).toHaveBeenCalledTimes(1);
  });

  // The callback slot lives on a root-scoped singleton, so a wrapper left behind outlives the component
  // and would answer a later reload from a dead instance - a real HTTP lookup nobody is waiting for.
  // Drives the real wrap rather than planting the private field, so it covers the PAIR: dropping the
  // capture would leave the slot holding undefined after destroy, which is worse than never unwrapping.
  it('hands the shared callback slot back on destroy and stops answering it', () => {
    const baseCallback = vi.fn();
    mockShiftService.onExternalFilterChange = baseCallback;

    (component as any).wrapFilterChangeCallback();
    expect(mockShiftService.onExternalFilterChange).not.toBe(baseCallback);

    component.ngOnDestroy();
    mockShiftService.onExternalFilterChange();

    expect(mockShiftService.onExternalFilterChange).toBe(baseCallback);
    expect(mockAttributionService.getByEntityIds).not.toHaveBeenCalled();
  });

  // Angular may build the next instance before destroying this one; restoring blindly would then tear
  // out a wrapper that is already in use.
  it('leaves the shared callback slot alone when a newer instance already took it over', () => {
    const baseCallback = vi.fn();
    const newerWrapper = vi.fn();
    mockShiftService.onExternalFilterChange = baseCallback;
    (component as any).wrapFilterChangeCallback();
    mockShiftService.onExternalFilterChange = newerWrapper;

    component.ngOnDestroy();

    expect(mockShiftService.onExternalFilterChange).toBe(newerWrapper);
  });

  // The race the request counter exists for: paging fast enough that an earlier page's answer lands
  // after a later one. Without the guard the stale answer wins simply by arriving last.
  it('ignores an earlier response that arrives after a later one', () => {
    load();
    load();

    pending[1].next([attribution('container-2')]);
    pending[0].next([attribution('container-1')]);

    expect(component.proactiveAttributions().has('container-2')).toBe(true);
    expect(component.proactiveAttributions().has('container-1')).toBe(false);
  });
});
