// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { UpdatesSettingComponent } from './updates-setting.component';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';

describe('UpdatesSettingComponent', () => {
  let component: UpdatesSettingComponent;
  let fixture: ComponentFixture<UpdatesSettingComponent>;
  let mockUpdate: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;
  let updateConfigSignal: ReturnType<typeof signal<UpdateConfigSettings>>;
  let triggerSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    mockUpdate = {
      getStatus: vi.fn().mockReturnValue(of({
        currentVersion: '1.0.0',
        availability: { currentVersion: '1.0.0', latestVersion: '1.2.0', containsMigrations: false, isUpdateAvailable: true },
        activeOperation: null,
        lastOperation: null,
      })),
      getHistory: vi.fn().mockReturnValue(of([])),
      triggerUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Update enqueued.' })),
      rollbackUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Rollback enqueued.' })),
    };

    updateConfigSignal = signal(new UpdateConfigSettings());
    triggerSignal = signal(0);
    const mockSettings = {
      appSettings: { updateConfigSettings: updateConfigSignal },
      settingsChangeTrigger: triggerSignal,
    };

    await TestBed.configureTestingModule({
      imports: [UpdatesSettingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementUpdateService, useValue: mockUpdate },
        { provide: DataManagementSettingsService, useValue: mockSettings },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatesSettingComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads status + history on init', () => {
    fixture.detectChanges();
    expect(mockUpdate.getStatus).toHaveBeenCalled();
    expect(mockUpdate.getHistory).toHaveBeenCalled();
    expect(component.status()?.availability?.isUpdateAvailable).toBe(true);
  });

  it('mirrors the central auto-update config into the local form', () => {
    updateConfigSignal.set({ ...new UpdateConfigSettings(), channel: 'Beta', autoEnabled: true });
    fixture.detectChanges();
    expect(component.config()?.channel).toBe('Beta');
    expect(component.config()?.autoEnabled).toBe(true);
  });

  it('persists config changes via the settings auto-save mechanism', () => {
    fixture.detectChanges();
    component.config.set({ ...component.config()!, channel: 'Beta' });
    component.onConfigChange();
    expect(updateConfigSignal().channel).toBe('Beta');
    expect(triggerSignal()).toBeGreaterThan(0);
  });

  it('triggers an update and stores the action message', async () => {
    fixture.detectChanges();
    await component.triggerNow();
    expect(mockUpdate.triggerUpdate).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Update enqueued.');
  });
});
