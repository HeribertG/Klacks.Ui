// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { UpdatesSettingComponent } from './updates-setting.component';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { IUpdateStatus } from 'src/app/domain/models/settings/update-status.interface';
import { EngineUpgradeBlockedReason } from 'src/app/domain/models/settings/engine-upgrade-blocked-reason.enum';
import { ENGINE_UPGRADE_KEYS, ENGINE_UPGRADE_REASON_KEYS } from 'src/app/domain/constants/engine-upgrade.constants';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';

const BASE_STATUS: IUpdateStatus = {
  currentVersion: '1.0.0',
  availability: { currentVersion: '1.0.0', latestVersion: '1.2.0', containsMigrations: false, isUpdateAvailable: true },
  activeOperation: null,
  lastOperation: null,
  currentMajor: 17,
  availableMajor: null,
  canStartEngineUpgrade: false,
  engineUpgradeBlockedReason: EngineUpgradeBlockedReason.NoEngineInManifest,
};

interface ConfirmOptions {
  type: ModalType;
  message: string;
  onConfirm: () => void;
}

describe('UpdatesSettingComponent', () => {
  let component: UpdatesSettingComponent;
  let fixture: ComponentFixture<UpdatesSettingComponent>;
  let mockUpdate: Partial<Record<keyof DataManagementUpdateService, ReturnType<typeof vi.fn>>>;
  let updateConfigSignal: ReturnType<typeof signal<UpdateConfigSettings>>;
  let triggerSignal: ReturnType<typeof signal<number>>;
  let mockModal: { openModal: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockUpdate = {
      getStatus: vi.fn().mockReturnValue(of(BASE_STATUS)),
      getHistory: vi.fn().mockReturnValue(of([])),
      triggerUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Update enqueued.' })),
      rollbackUpdate: vi.fn().mockReturnValue(of({ enqueued: true, reason: 'Rollback enqueued.' })),
      deleteHistoryEntry: vi.fn().mockReturnValue(of(true)),
      installWhisperPlugin: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-1', reason: 'Install enqueued.' }),
      uninstallWhisperPlugin: vi.fn().mockResolvedValue({ enqueued: true, operationId: 'op-2', reason: 'Uninstall enqueued.' }),
      startEngineUpgrade: vi.fn().mockReturnValue(of({ enqueued: true, operationId: 'op-pg', blockedReason: null })),
    };
    mockModal = { openModal: vi.fn() };

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
        { provide: ModalService, useValue: mockModal },
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

  it('allows continuing a Pending WhisperInstall history entry', () => {
    fixture.detectChanges();
    expect(component.canContinueHistoryEntry({
      id: '1',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date().toISOString(),
    })).toBe(true);
  });

  it('deletes the stale Pending row first, then re-issues the model install', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '1',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).toHaveBeenCalledWith('1');
    expect(mockUpdate.installWhisperPlugin).toHaveBeenCalledWith('large-v3-turbo');
    expect(component.actionMessage()).toBe('Install enqueued.');
  });

  it('re-issues the uninstall when continuing a Failed WhisperUninstall entry without deleting first', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '2',
      operationType: 'WhisperUninstall',
      status: 'Failed',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: '',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).not.toHaveBeenCalled();
    expect(mockUpdate.uninstallWhisperPlugin).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Uninstall enqueued.');
  });

  it('deletes the stale Pending row first, then re-triggers a plain Update entry', async () => {
    fixture.detectChanges();
    await component.continueHistoryEntry({
      id: '3',
      operationType: 'Update',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '1.0.0',
      targetVersion: '1.2.0',
      containsMigrations: false,
      requestedAt: '2026-08-06T00:00:00Z',
    });
    expect(mockUpdate.deleteHistoryEntry).toHaveBeenCalledWith('3');
    expect(mockUpdate.triggerUpdate).toHaveBeenCalled();
    expect(component.actionMessage()).toBe('Update enqueued.');
  });

  it('marks a long-queued row that no updater claimed as awaiting the update service', () => {
    fixture.detectChanges();
    expect(component.isAwaitingUpdater({
      id: '4',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    })).toBe(true);
  });

  it('renders the waiting status and no retry button for an unclaimed row', () => {
    mockUpdate.getHistory!.mockReturnValue(of([{
      id: '7',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    }]));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('settings.updates.history.status-awaiting');
    expect(element.querySelector('app-icon-refresh-grey')).toBeFalsy();
    expect(element.querySelector('app-icon-trash-red')).toBeTruthy();
  });

  it('stops offering a retry on a row that is only waiting for the update service', () => {
    fixture.detectChanges();
    expect(component.canContinueHistoryEntry({
      id: '6',
      operationType: 'WhisperInstall',
      status: 'Pending',
      channel: 'Stable',
      fromVersion: '',
      targetVersion: 'large-v3-turbo',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
    })).toBe(false);
  });

  it('leaves a claimed row untouched however long it runs', () => {
    fixture.detectChanges();
    expect(component.isAwaitingUpdater({
      id: '5',
      operationType: 'Update',
      status: 'Running',
      channel: 'Stable',
      fromVersion: '1.0.0',
      targetVersion: '1.2.0',
      containsMigrations: false,
      requestedAt: new Date(Date.now() - 600000).toISOString(),
      startedAt: new Date(Date.now() - 590000).toISOString(),
    })).toBe(false);
  });
  describe('database engine section', () => {
    const offeredStatus = (overrides: Partial<IUpdateStatus>): IUpdateStatus => ({
      ...BASE_STATUS,
      availableMajor: 19,
      canStartEngineUpgrade: true,
      engineUpgradeBlockedReason: null,
      ...overrides,
    });
    const render = (status: IUpdateStatus): HTMLElement => {
      mockUpdate.getStatus!.mockReturnValue(of(status));
      fixture.detectChanges();
      return fixture.nativeElement;
    };
    const confirmOptions = (): ConfirmOptions => mockModal.openModal.mock.calls[0][0];

    it('shows the major in use and only the up-to-date text when the manifest offers no engine', () => {
      const element = render(BASE_STATUS);

      expect(element.querySelector('#updates-engine-current')?.textContent).toContain('17');
      expect(element.querySelector('#updates-engine-up-to-date')).toBeTruthy();
      expect(element.querySelector('#updates-engine-upgrade-btn')).toBeFalsy();
      expect(element.querySelector('#updates-engine-blocked')).toBeFalsy();
    });

    it('treats a not newer engine as up to date without a reason text', () => {
      const element = render(offeredStatus({
        availableMajor: 17,
        canStartEngineUpgrade: false,
        engineUpgradeBlockedReason: EngineUpgradeBlockedReason.NotNewerThanCurrent,
      }));

      expect(element.querySelector('#updates-engine-up-to-date')).toBeTruthy();
      expect(element.querySelector('#updates-engine-upgrade-btn')).toBeFalsy();
      expect(element.querySelector('#updates-engine-blocked')).toBeFalsy();
    });

    it('offers the upgrade button with the available major when the upgrade can start', () => {
      const element = render(offeredStatus({}));

      expect(element.querySelector('#updates-engine-available')?.textContent).toContain('19');
      const button = element.querySelector<HTMLButtonElement>('#updates-engine-upgrade-btn');
      expect(button?.textContent).toContain(ENGINE_UPGRADE_KEYS.BUTTON);
      expect(button?.disabled).toBe(false);
      expect(component.engineMajorParams()).toEqual({ major: 19 });
    });

    it.each([
      EngineUpgradeBlockedReason.OperationInProgress,
      EngineUpgradeBlockedReason.NoArtifactForInstallation,
      EngineUpgradeBlockedReason.UpdaterCapabilityMissing,
      EngineUpgradeBlockedReason.UpdaterCapabilityStale,
    ])('explains why the upgrade cannot start for %s instead of showing the button', (reason) => {
      const element = render(offeredStatus({ canStartEngineUpgrade: false, engineUpgradeBlockedReason: reason }));

      expect(element.querySelector('#updates-engine-upgrade-btn')).toBeFalsy();
      expect(element.querySelector('#updates-engine-blocked')?.textContent).toContain(ENGINE_UPGRADE_REASON_KEYS[reason]);
    });

    it('disables the button while another action is busy', () => {
      render(offeredStatus({}));
      component.busy.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#updates-engine-upgrade-btn').disabled).toBe(true);
    });

    it('asks for confirmation first and starts nothing before it is confirmed', () => {
      render(offeredStatus({}));

      fixture.nativeElement.querySelector('#updates-engine-upgrade-btn').click();

      expect(mockModal.openModal).toHaveBeenCalledTimes(1);
      expect(confirmOptions().type).toBe(ModalType.Confirmation);
      expect(confirmOptions().message).toBe(ENGINE_UPGRADE_KEYS.CONFIRM_MESSAGE);
      expect(mockUpdate.startEngineUpgrade).not.toHaveBeenCalled();
    });

    it('starts the upgrade on confirmation, reports it as queued and reloads status and history', async () => {
      render(offeredStatus({}));
      component.requestEngineUpgrade();
      const statusCalls = mockUpdate.getStatus!.mock.calls.length;
      const historyCalls = mockUpdate.getHistory!.mock.calls.length;

      confirmOptions().onConfirm();
      await fixture.whenStable();

      expect(mockUpdate.startEngineUpgrade).toHaveBeenCalledTimes(1);
      expect(component.engineMessage()).toBe(ENGINE_UPGRADE_KEYS.ENQUEUED);
      expect(component.busy()).toBe(false);
      expect(mockUpdate.getStatus!.mock.calls.length).toBe(statusCalls + 1);
      expect(mockUpdate.getHistory!.mock.calls.length).toBe(historyCalls + 1);
    });

    it('shows the reason of a refused start as status text', async () => {
      mockUpdate.startEngineUpgrade!.mockReturnValue(of({
        enqueued: false,
        operationId: null,
        blockedReason: EngineUpgradeBlockedReason.UpdaterCapabilityStale,
      }));
      render(offeredStatus({}));
      component.requestEngineUpgrade();

      confirmOptions().onConfirm();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.engineMessage()).toBe(ENGINE_UPGRADE_REASON_KEYS[EngineUpgradeBlockedReason.UpdaterCapabilityStale]);
      expect(fixture.nativeElement.querySelector('#updates-engine-message').getAttribute('role')).toBe('status');
    });

    it('reports a failed start and frees the card again', async () => {
      mockUpdate.startEngineUpgrade!.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      render(offeredStatus({}));
      component.requestEngineUpgrade();

      confirmOptions().onConfirm();
      await fixture.whenStable();

      expect(component.engineMessage()).toBe(ENGINE_UPGRADE_KEYS.FAILED);
      expect(component.busy()).toBe(false);
    });

    describe('while an engine upgrade runs', () => {
      const runningStatus = (): IUpdateStatus => offeredStatus({
        canStartEngineUpgrade: false,
        engineUpgradeBlockedReason: EngineUpgradeBlockedReason.OperationInProgress,
      });
      const historyRow = {
        id: '8',
        operationType: 'Update',
        status: 'Failed',
        channel: 'Stable',
        fromVersion: '1.0.0',
        targetVersion: '1.2.0',
        containsMigrations: false,
        requestedAt: '2026-08-06T00:00:00Z',
      };

      it('locks install, rollback and every history action and says the database upgrade runs', () => {
        mockUpdate.getHistory!.mockReturnValue(of([historyRow]));
        const element = render(runningStatus());

        expect(component.hasActiveOperation()).toBe(true);
        expect(element.querySelector<HTMLButtonElement>('#updates-trigger-btn')?.disabled).toBe(true);
        expect(element.querySelector<HTMLButtonElement>('#updates-rollback-btn')?.disabled).toBe(true);
        const historyButtons = element.querySelectorAll<HTMLButtonElement>('#updates-setting-history button');
        expect(historyButtons.length).toBe(2);
        historyButtons.forEach((button) => expect(button.disabled).toBe(true));
        expect(element.querySelector('#updates-engine-running')?.textContent).toContain(ENGINE_UPGRADE_KEYS.RUNNING);
      });

      it('names the normal operation instead of the database upgrade when the status has an active operation', () => {
        const element = render({ ...runningStatus(), activeOperation: { ...historyRow, status: 'Running' } });

        expect(component.hasActiveOperation()).toBe(true);
        expect(component.engineUpgradeRunning()).toBe(false);
        expect(element.querySelector('#updates-engine-running')).toBeFalsy();
        expect(element.querySelector<HTMLButtonElement>('#updates-rollback-btn')?.disabled).toBe(true);
      });

      it('leaves the actions free when the upgrade is blocked for another reason', () => {
        mockUpdate.getHistory!.mockReturnValue(of([historyRow]));
        const element = render(offeredStatus({
          canStartEngineUpgrade: false,
          engineUpgradeBlockedReason: EngineUpgradeBlockedReason.UpdaterCapabilityStale,
        }));

        expect(component.hasActiveOperation()).toBe(false);
        expect(element.querySelector<HTMLButtonElement>('#updates-rollback-btn')?.disabled).toBe(false);
        element.querySelectorAll<HTMLButtonElement>('#updates-setting-history button')
          .forEach((button) => expect(button.disabled).toBe(false));
        expect(element.querySelector('#updates-engine-running')).toBeFalsy();
      });
    });

    it('opens no confirmation while no newer engine is offered', () => {
      render(BASE_STATUS);

      component.requestEngineUpgrade();

      expect(mockModal.openModal).not.toHaveBeenCalled();
    });
  });
});
