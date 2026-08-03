// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { SettingsHomeComponent } from './settings-home.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';

describe('SettingsHomeComponent', () => {
  let fixture: ComponentFixture<SettingsHomeComponent>;
  let component: SettingsHomeComponent;
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
      imports: [SettingsHomeComponent],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: {
            userAdmin: { currentAccountId: { set: vi.fn() } },
            readData: vi.fn(),
          },
        },
        { provide: WorkplaceStateService, useValue: { setActiveManagerByRoute: vi.fn() } },
        { provide: LocalStorageService, useValue: { get: vi.fn().mockReturnValue('1') } },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: FeaturePluginStateService, useValue: {} },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ],
    })
      .overrideComponent(SettingsHomeComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(SettingsHomeComponent);
    component = fixture.componentInstance;
  });

  it('starts with every section expanded', () => {
    expect(Object.values(component.sections).every((expanded) => expanded)).toBe(true);
  });

  it('expands the owning section when Klacksy requests a target inside it', () => {
    component.sections['communication'] = false;

    targetRequested$.next({ target: 'reports' });

    expect(component.sections['communication']).toBe(true);
  });

  it('ignores target requests for pages other than settings', () => {
    component.sections['communication'] = false;

    targetRequested$.next({ target: 'goal-candidates-panel.approve' });

    expect(component.sections['communication']).toBe(false);
  });
});
