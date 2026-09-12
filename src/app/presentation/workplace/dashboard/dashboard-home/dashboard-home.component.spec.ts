// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { DashboardHomeComponent } from './dashboard-home.component';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import {
  DASHBOARD_SECTION_COVERAGE,
  DASHBOARD_SECTION_OVERVIEW,
} from './dashboard-section-keys.constants';

describe('DashboardHomeComponent Klacksy target auto-expand', () => {
  let fixture: ComponentFixture<DashboardHomeComponent>;
  let component: DashboardHomeComponent;
  let eventBusMock: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; onAny: ReturnType<typeof vi.fn> };
  let targetRequested$: Subject<{ target: string }>;

  beforeEach(async () => {
    targetRequested$ = new Subject<{ target: string }>();
    eventBusMock = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(targetRequested$.asObservable()),
      onAny: vi.fn().mockReturnValue(new Subject()),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        {
          provide: WorkplaceStateService,
          useValue: { setActiveManagerByRoute: vi.fn(), isFocusChanged: { set: vi.fn() } },
        },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        {
          provide: LocalStorageService,
          useValue: { get: vi.fn(), set: vi.fn(), getJson: vi.fn().mockReturnValue(null), setJson: vi.fn() },
        },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ],
    })
      .overrideComponent(DashboardHomeComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardHomeComponent);
    component = fixture.componentInstance;
  });

  it('expands the owning section when Klacksy requests a known dashboard target', () => {
    component.sectionsState.update((s) => ({ ...s, [DASHBOARD_SECTION_COVERAGE]: false }));

    targetRequested$.next({ target: 'dashboard.shift-coverage' });

    expect(component.sectionsState()[DASHBOARD_SECTION_COVERAGE]).toBe(true);
  });

  it('expands the shared overview section for either overview widget target', () => {
    component.sectionsState.update((s) => ({ ...s, [DASHBOARD_SECTION_OVERVIEW]: false }));

    targetRequested$.next({ target: 'dashboard.shifts-overview' });

    expect(component.sectionsState()[DASHBOARD_SECTION_OVERVIEW]).toBe(true);
  });

  it('leaves the section state untouched for an unknown target', () => {
    component.sectionsState.update((s) => ({ ...s, [DASHBOARD_SECTION_OVERVIEW]: false }));

    targetRequested$.next({ target: 'goal-candidates-panel.approve' });

    expect(component.sectionsState()[DASHBOARD_SECTION_OVERVIEW]).toBe(false);
  });

  it('unhides a hidden section and expands it when Klacksy requests one of its targets', () => {
    component.sectionVisibilityModel.update((m) => ({ ...m, [DASHBOARD_SECTION_COVERAGE]: false }));
    component.sectionsState.update((s) => ({ ...s, [DASHBOARD_SECTION_COVERAGE]: false }));

    targetRequested$.next({ target: 'dashboard.shift-coverage' });

    expect(component.sectionVisibilityModel()[DASHBOARD_SECTION_COVERAGE]).toBe(true);
    expect(component.sectionsState()[DASHBOARD_SECTION_COVERAGE]).toBe(true);
    expect(component.visibleSectionOrder()).toContain(DASHBOARD_SECTION_COVERAGE);
  });
});
