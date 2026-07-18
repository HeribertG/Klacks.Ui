// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ActiveIndustriesSettingsComponent } from './active-industries-settings.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { ActiveIndustriesSettings, IActiveIndustriesSettings } from 'src/app/domain/models/settings/app-settings.model';

describe('ActiveIndustriesSettingsComponent', () => {
  let component: ActiveIndustriesSettingsComponent;
  let fixture: ComponentFixture<ActiveIndustriesSettingsComponent>;
  let activeIndustriesSignal: ReturnType<typeof signal<IActiveIndustriesSettings>>;
  let isResetSignal: ReturnType<typeof signal<boolean>>;
  let triggerSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    activeIndustriesSignal = signal<IActiveIndustriesSettings>(new ActiveIndustriesSettings());
    isResetSignal = signal(false);
    triggerSignal = signal(0);

    const mockSettings = {
      isReset: isResetSignal,
      settingsChangeTrigger: triggerSignal,
      appSettings: { activeIndustriesSettings: activeIndustriesSignal },
    };

    const mockManualLoader = {
      loadManual: vi.fn().mockReturnValue(of('')),
    };

    await TestBed.configureTestingModule({
      imports: [ActiveIndustriesSettingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementSettingsService, useValue: mockSettings },
        { provide: ManualLoaderService, useValue: mockManualLoader },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveIndustriesSettingsComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('checks all five industries when the setting is missing (default)', () => {
    fixture.detectChanges();
    expect(component.formModel()).toEqual({
      homecare: true,
      healthcare: true,
      security: true,
      facility: true,
      logistics: true,
    });
    expect(component.hasSelection()).toBe(true);
  });

  it('checks exactly the stored industries', () => {
    activeIndustriesSignal.set({ activeIndustries: ['healthcare', 'security'] });
    fixture.detectChanges();
    expect(component.formModel()).toEqual({
      homecare: false,
      healthcare: true,
      security: true,
      facility: false,
      logistics: false,
    });
  });

  it('syncs the selection in canonical slug order to the settings store', () => {
    fixture.detectChanges();
    component.formModel.set({
      homecare: false,
      healthcare: true,
      security: true,
      facility: true,
      logistics: true,
    });
    TestBed.tick();
    expect(activeIndustriesSignal().activeIndustries).toEqual([
      'healthcare',
      'security',
      'facility',
      'logistics',
    ]);
    expect(triggerSignal()).toBeGreaterThan(0);
  });

  it('blocks saving and shows the inline hint when nothing is checked', () => {
    fixture.detectChanges();
    const triggerBefore = triggerSignal();
    component.formModel.set({
      homecare: false,
      healthcare: false,
      security: false,
      facility: false,
      logistics: false,
    });
    TestBed.tick();
    fixture.detectChanges();
    expect(activeIndustriesSignal().activeIndustries).toEqual([
      'homecare',
      'healthcare',
      'security',
      'facility',
      'logistics',
    ]);
    expect(triggerSignal()).toBe(triggerBefore);
    expect(component.hasSelection()).toBe(false);
    const error = fixture.nativeElement.querySelector('#active-industries-validation-error');
    expect(error).toBeTruthy();
  });

  it('resumes syncing after the selection becomes valid again', () => {
    fixture.detectChanges();
    component.formModel.set({
      homecare: false,
      healthcare: false,
      security: false,
      facility: false,
      logistics: false,
    });
    TestBed.tick();
    component.formModel.set({
      homecare: false,
      healthcare: false,
      security: true,
      facility: false,
      logistics: false,
    });
    TestBed.tick();
    expect(activeIndustriesSignal().activeIndustries).toEqual(['security']);
    expect(triggerSignal()).toBeGreaterThan(0);
  });
});
