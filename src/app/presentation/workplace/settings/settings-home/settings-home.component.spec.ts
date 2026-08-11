// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { SettingsHomeComponent } from './settings-home.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
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
  let localStorageMock: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(SettingsHomeComponent);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    targetRequested$ = new Subject<{ target: string }>();
    eventBusMock = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(targetRequested$.asObservable()),
      onAny: vi.fn().mockReturnValue(new Subject()),
    };

    localStorageMock = { get: vi.fn().mockReturnValue('1'), set: vi.fn() };

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
        { provide: LocalStorageService, useValue: localStorageMock },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: FeaturePluginStateService, useValue: {} },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ],
    })
      .overrideComponent(SettingsHomeComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    createComponent();
  });

  it('starts with every section expanded', () => {
    expect(Object.values(component.sections).every((expanded) => expanded)).toBe(true);
  });

  it('expands the owning section when Klacksy requests a target inside it', () => {
    component.sections['communication'] = false;

    targetRequested$.next({ target: 'reports' });

    expect(component.sections['communication']).toBe(true);
  });

  it.each(['individual-periods', 'monthly-target-hours'])(
    'routes %s to the work section it now lives in',
    (target) => {
      component.sections['work'] = false;
      component.sections['organization'] = false;

      targetRequested$.next({ target });

      expect(component.sections['work']).toBe(true);
      expect(component.sections['organization']).toBe(false);
    },
  );

  it('ignores target requests for pages other than settings', () => {
    component.sections['communication'] = false;

    targetRequested$.next({ target: 'goal-candidates-panel.approve' });

    expect(component.sections['communication']).toBe(false);
  });

  it('marks the component for check so the OnPush view actually renders the expanded section', () => {
    component.sections['communication'] = false;
    const changeDetectorRef = (component as unknown as { changeDetectorRef: ChangeDetectorRef }).changeDetectorRef;
    const markForCheckSpy = vi.spyOn(changeDetectorRef, 'markForCheck');

    targetRequested$.next({ target: 'reports' });

    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('keeps expert mode off when local storage holds no stored choice', () => {
    expect(component.isChecked).toBe(false);
  });

  it('restores the stored expert mode choice', () => {
    localStorageMock.get.mockReturnValue('true');

    createComponent();

    expect(component.isChecked).toBe(true);
  });

  it('persists the expert mode choice when the switch is toggled', () => {
    component.isChecked = true;

    component.onComplexModeChecked();

    expect(localStorageMock.set).toHaveBeenCalledWith(StorageKeys.SETTINGS_EXPERT_MODE, 'true');
  });

  it.each([
    ['counter-rules', 'compliance'],
    ['active-industries', 'compliance'],
    ['holiday-work-exemptions', 'compliance'],
    ['individual-periods', 'work'],
    ['llm-models', 'llm'],
    ['klacksy-autonomy', 'klacksy'],
    ['updates', 'system'],
    ['email-config', 'communication'],
    ['imap-setting', 'communication'],
    ['data-retention', 'general'],
  ])('turns expert mode on for %s, which only renders in expert mode', (target, section) => {
    targetRequested$.next({ target });

    expect(component.isChecked).toBe(true);
    expect(component.sections[section]).toBe(true);
  });

  it.each(['reports', 'spam-rules', 'branches', 'grid-color', 'user-management'])(
    'leaves expert mode untouched for %s, which is always visible',
    (target) => {
      targetRequested$.next({ target });

      expect(component.isChecked).toBe(false);
    },
  );
});
