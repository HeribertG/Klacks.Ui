// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { UpdatesSettingComponent } from './updates-setting.component';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';

describe('UpdatesSettingComponent', () => {
  let component: UpdatesSettingComponent;
  let fixture: ComponentFixture<UpdatesSettingComponent>;
  let mockService: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;

  beforeEach(async () => {
    mockService = {
      getStatus: vi.fn().mockReturnValue(of({
        currentVersion: '1.0.0',
        availability: { currentVersion: '1.0.0', latestVersion: '1.2.0', containsMigrations: false, isUpdateAvailable: true },
        activeOperation: null,
        lastOperation: null,
      })),
      getHistory: vi.fn().mockReturnValue(of([])),
      getConfig: vi.fn().mockReturnValue(of({
        autoEnabled: false, channel: 'Stable', checkIntervalHours: 6,
        maintenanceWindowStart: '', maintenanceWindowEnd: '', notifyOnly: false,
        backupRetentionCount: 3, pinnedVersion: '',
      })),
      triggerUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Update enqueued.' })),
      rollbackUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Rollback enqueued.' })),
      saveConfig: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [UpdatesSettingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataManagementUpdateService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatesSettingComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads status, history and config on init', () => {
    fixture.detectChanges();
    expect(mockService.getStatus).toHaveBeenCalled();
    expect(mockService.getHistory).toHaveBeenCalled();
    expect(mockService.getConfig).toHaveBeenCalled();
    expect(component.status()?.availability?.isUpdateAvailable).toBe(true);
  });

  it('triggers an update and stores the action message', async () => {
    fixture.detectChanges();
    await component.triggerNow();
    expect(mockService.triggerUpdate).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Update enqueued.');
  });

  it('saves config on change', () => {
    fixture.detectChanges();
    component.onConfigChange();
    expect(mockService.saveConfig).toHaveBeenCalled();
  });
});
