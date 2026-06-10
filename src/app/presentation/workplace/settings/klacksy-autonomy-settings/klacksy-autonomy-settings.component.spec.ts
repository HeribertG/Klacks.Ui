// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { KlacksyAutonomySettingsComponent } from './klacksy-autonomy-settings.component';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

describe('KlacksyAutonomySettingsComponent', () => {
  let component: KlacksyAutonomySettingsComponent;
  let fixture: ComponentFixture<KlacksyAutonomySettingsComponent>;
  let mockDataService: {
    getAutonomyLevel: ReturnType<typeof vi.fn>;
    setAutonomyLevel: ReturnType<typeof vi.fn>;
  };
  let mockToast: { showError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDataService = {
      getAutonomyLevel: vi.fn().mockReturnValue(of({ level: 2, name: 'Autonomous' })),
      setAutonomyLevel: vi.fn().mockReturnValue(of({ level: 3, name: 'FullyAutonomous' })),
    };
    mockToast = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [KlacksyAutonomySettingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataAssistantService, useValue: mockDataService },
        { provide: ToastShowService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KlacksyAutonomySettingsComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the current autonomy level on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDataService.getAutonomyLevel).toHaveBeenCalled();
    expect(component.currentLevel()).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('offers all four autonomy levels', () => {
    expect(component.levels.map((l) => l.value)).toEqual([0, 1, 2, 3]);
  });

  it('persists a newly selected level immediately', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onSelectLevel(3);

    expect(mockDataService.setAutonomyLevel).toHaveBeenCalledWith({ level: 3 });
    expect(component.currentLevel()).toBe(3);
    expect(component.isSaving()).toBe(false);
  });

  it('skips the PUT call when the same level is selected again', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onSelectLevel(2);

    expect(mockDataService.setAutonomyLevel).not.toHaveBeenCalled();
  });

  it('shows an error toast and keeps the old level when saving fails', async () => {
    mockDataService.setAutonomyLevel = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('network')));
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onSelectLevel(0);

    expect(mockToast.showError).toHaveBeenCalled();
    expect(component.currentLevel()).toBe(2);
    expect(component.isSaving()).toBe(false);
  });

  it('shows an error toast when the initial load fails', async () => {
    mockDataService.getAutonomyLevel = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('network')));
    fixture = TestBed.createComponent(KlacksyAutonomySettingsComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockToast.showError).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });
});
