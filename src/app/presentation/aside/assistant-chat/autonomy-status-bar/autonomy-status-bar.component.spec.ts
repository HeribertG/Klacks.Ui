// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, of, throwError } from 'rxjs';

import { AutonomyStatusBarComponent } from './autonomy-status-bar.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataProactiveGovernanceService } from 'src/app/infrastructure/api/assistant/data-proactive-governance.service';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';

describe('AutonomyStatusBarComponent', () => {
  let fixture: ComponentFixture<AutonomyStatusBarComponent>;
  let component: AutonomyStatusBarComponent;
  let mockDataGovernanceService: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockToast: { showError: ReturnType<typeof vi.fn> };
  let isAdmin: boolean;

  const governance = (killSwitchActive: boolean): IProactiveGovernance => ({
    globalAutonomyLevel: 2,
    globalAutonomyCap: 2,
    killSwitchActive,
    rules: [],
  });

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AutonomyStatusBarComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataProactiveGovernanceService, useValue: mockDataGovernanceService },
        { provide: ToastShowService, useValue: mockToast },
        {
          provide: AuthorizationService,
          useValue: {
            get isAdmin(): boolean {
              return isAdmin;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AutonomyStatusBarComponent);
    component = fixture.componentInstance;
  };

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    isAdmin = true;
    mockDataGovernanceService = {
      get: vi.fn().mockReturnValue(of(governance(false))),
      update: vi.fn().mockReturnValue(of(governance(true))),
    };
    mockToast = { showError: vi.fn() };
  });

  it('creates', async () => {
    await setup();

    expect(component).toBeTruthy();
  });

  it('loads the stored state once for an administrator', async () => {
    await setup();
    await settle();

    expect(mockDataGovernanceService.get).toHaveBeenCalledTimes(1);
    expect(component.autonomyEnabled()).toBe(true);
  });

  it('shows nothing and asks the admin-only endpoint nothing for a non-administrator', async () => {
    isAdmin = false;
    await setup();
    await settle();

    expect(mockDataGovernanceService.get).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#klacksy-autonomy-switch')).toBeNull();
  });

  it('reads the stored kill switch inverted: kill switch set means autonomy off', async () => {
    mockDataGovernanceService.get.mockReturnValue(of(governance(true)));

    await setup();
    await settle();

    expect(component.autonomyEnabled()).toBe(false);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#klacksy-autonomy-switch');
    expect(input.checked).toBe(false);
    expect(fixture.nativeElement.querySelector('.autonomy-stopped')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.autonomy-hint')).not.toBeNull();
  });

  it('stays quiet while autonomy is running', async () => {
    await setup();
    await settle();

    expect(fixture.nativeElement.querySelector('.autonomy-stopped')).toBeNull();
    expect(fixture.nativeElement.querySelector('.autonomy-hint')).toBeNull();
  });

  it('sets the kill switch when autonomy is switched off', async () => {
    await setup();
    await settle();

    await component.onToggleAutonomy(false);

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({ killSwitch: true });
    expect(component.autonomyEnabled()).toBe(false);
  });

  it('clears the kill switch when autonomy is switched on', async () => {
    mockDataGovernanceService.get.mockReturnValue(of(governance(true)));
    mockDataGovernanceService.update.mockReturnValue(of(governance(false)));

    await setup();
    await settle();

    await component.onToggleAutonomy(true);

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({ killSwitch: false });
    expect(component.autonomyEnabled()).toBe(true);
  });

  it('jumps back and reports the failure when the switch cannot be written', async () => {
    await setup();
    await settle();
    mockDataGovernanceService.update.mockReturnValue(throwError(() => new Error('rejected')));

    await component.onToggleAutonomy(false);

    expect(component.autonomyEnabled()).toBe(true);
    expect(mockToast.showError).toHaveBeenCalled();
    expect(component.isSaving()).toBe(false);
  });

  it('reports a failed initial read instead of pretending autonomy is running', async () => {
    mockDataGovernanceService.get.mockReturnValue(throwError(() => new Error('offline')));

    await setup();
    await settle();

    expect(mockToast.showError).toHaveBeenCalled();
  });

  it('skips the call when the switch is set to the state it already has', async () => {
    await setup();
    await settle();

    await component.onToggleAutonomy(true);

    expect(mockDataGovernanceService.update).not.toHaveBeenCalled();
  });

  it('follows a state written by the settings card on the same page', async () => {
    await setup();
    await settle();

    const governanceService = TestBed.inject(ProactiveGovernanceService);
    await firstValueFrom(governanceService.update({ killSwitch: true }));
    fixture.detectChanges();

    expect(component.autonomyEnabled()).toBe(false);
  });
});
