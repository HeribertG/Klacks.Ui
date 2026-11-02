// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ChangeDetectorRef, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EditShiftHomeComponent } from './edit-shift-home.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { SearchService } from 'src/app/application/services/search.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { DraftRecoveryService } from 'src/app/presentation/services/draft-recovery.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ShiftEditPermissionService } from 'src/app/application/services/shift-edit-permission.service';
import { TranslateService } from '@ngx-translate/core';
import { ShiftFormService } from '../services/shift-form.service';

interface ShiftServiceStub {
  isReset: WritableSignal<boolean>;
  isRead: WritableSignal<boolean>;
  returnUrl: string | null;
  onBeforeSave?: () => void;
  onReadCompleted?: () => void;
  readShift: ReturnType<typeof vi.fn>;
  createShift: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  hasChangesToLose?: ReturnType<typeof vi.fn>;
  resetData?: ReturnType<typeof vi.fn>;
}

describe('EditShiftHomeComponent - service callback slots', () => {
  let shiftService: ShiftServiceStub;
  let shiftFormService: { applyFormToShift: ReturnType<typeof vi.fn> };
  let draftRecoveryService: { offerRestore: ReturnType<typeof vi.fn> };

  const createComponent = (): EditShiftHomeComponent =>
    TestBed.runInInjectionContext(() => new EditShiftHomeComponent());

  beforeEach(() => {
    shiftService = {
      isReset: signal(false),
      isRead: signal(false),
      returnUrl: null,
      readShift: vi.fn(),
      createShift: vi.fn(),
      init: vi.fn(),
    };
    shiftFormService = { applyFormToShift: vi.fn() };
    draftRecoveryService = { offerRestore: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataManagementShiftService, useValue: shiftService },
        { provide: DataManagementGroupService, useValue: { init: vi.fn() } },
        { provide: WorkplaceStateService, useValue: { setActiveManagerByRoute: vi.fn() } },
        { provide: AuthorizationService, useValue: { hasAnyPermission: vi.fn(() => true) } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: LocalStorageService, useValue: { get: vi.fn(() => null) } },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: ShiftFormService, useValue: shiftFormService },
        { provide: DraftRecoveryService, useValue: draftRecoveryService },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: AuthService, useValue: { authenticated: vi.fn(() => true) } },
        { provide: ModalService, useValue: { openModal: vi.fn() } },
        { provide: ShiftEditPermissionService, useValue: { canWriteCurrentShift: vi.fn(() => true) } },
        { provide: TranslateService, useValue: { instant: vi.fn((key: string) => key) } },
      ],
    });
  });

  it('should route the slots to its own form and draft handling while it is alive', () => {
    // Arrange
    const component = createComponent();

    // Act
    component.ngOnInit();
    shiftService.onBeforeSave?.();
    shiftService.onReadCompleted?.();

    // Assert
    expect(shiftFormService.applyFormToShift).toHaveBeenCalledTimes(1);
    expect(draftRecoveryService.offerRestore).toHaveBeenCalledTimes(1);
  });

  it('should release both slots on destroy while they still hold its callbacks', () => {
    // Arrange
    const component = createComponent();
    component.ngOnInit();

    // Act
    component.ngOnDestroy();

    // Assert
    expect(shiftService.onBeforeSave).toBeUndefined();
    expect(shiftService.onReadCompleted).toBeUndefined();
  });

  it('should leave slots alone that a newer editor has taken over', () => {
    // Arrange
    const component = createComponent();
    component.ngOnInit();
    const newerBeforeSave = vi.fn();
    const newerReadCompleted = vi.fn();
    shiftService.onBeforeSave = newerBeforeSave;
    shiftService.onReadCompleted = newerReadCompleted;

    // Act
    component.ngOnDestroy();

    // Assert
    expect(shiftService.onBeforeSave).toBe(newerBeforeSave);
    expect(shiftService.onReadCompleted).toBe(newerReadCompleted);
  });
});

describe('EditShiftHomeComponent - leaving with unsaved changes', () => {
  let hasChangesToLose: ReturnType<typeof vi.fn>;
  let resetData: ReturnType<typeof vi.fn>;
  let authenticated: ReturnType<typeof vi.fn>;
  let canWriteCurrentShift: ReturnType<typeof vi.fn>;
  let openModal: ReturnType<typeof vi.fn>;

  const createComponent = (): EditShiftHomeComponent =>
    TestBed.runInInjectionContext(() => new EditShiftHomeComponent());

  const dialog = (): { type: ModalType; onConfirm: () => void; onDismiss: () => void } => openModal.mock.calls[0][0];

  beforeEach(() => {
    hasChangesToLose = vi.fn(() => true);
    resetData = vi.fn();
    authenticated = vi.fn(() => true);
    canWriteCurrentShift = vi.fn(() => true);
    openModal = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: { isReset: signal(false), isRead: signal(false), hasChangesToLose, resetData },
        },
        { provide: DataManagementGroupService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: SearchService, useValue: {} },
        { provide: SavebarService, useValue: {} },
        { provide: LayoutService, useValue: {} },
        { provide: LocalStorageService, useValue: { get: vi.fn(() => null) } },
        { provide: ShiftFormService, useValue: {} },
        { provide: DraftRecoveryService, useValue: {} },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: AuthService, useValue: { authenticated } },
        { provide: ModalService, useValue: { openModal } },
        { provide: ShiftEditPermissionService, useValue: { canWriteCurrentShift } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
  });

  it('leaves without asking when nothing is unsaved', () => {
    hasChangesToLose.mockReturnValue(false);

    expect(createComponent().canDeactivate('/workplace/shift')).toBe(true);
    expect(openModal).not.toHaveBeenCalled();
  });

  it('stays when the question is dismissed, and keeps the changes', async () => {
    const answer = createComponent().canDeactivate('/workplace/shift');

    expect(dialog().type).toBe(ModalType.Confirmation);
    dialog().onDismiss();

    await expect(answer).resolves.toBe(false);
    expect(resetData).not.toHaveBeenCalled();
  });

  it('leaves when the changes are discarded, and drops them from the shared service', async () => {
    const answer = createComponent().canDeactivate('/workplace/shift');

    dialog().onConfirm();

    await expect(answer).resolves.toBe(true);
    expect(resetData).toHaveBeenCalledTimes(1);
  });

  it('asks once while a second navigation waits for the same answer', async () => {
    const component = createComponent();

    const first = component.canDeactivate('/workplace/shift');
    const second = component.canDeactivate('/workplace/schedule');
    dialog().onDismiss();

    expect(openModal).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
  });

  it('asks again on the next try after a dismissed question', async () => {
    const component = createComponent();
    const first = component.canDeactivate('/workplace/shift');
    dialog().onDismiss();
    await first;

    void component.canDeactivate('/workplace/shift');

    expect(openModal).toHaveBeenCalledTimes(2);
  });

  it('does not ask on a read-only view', () => {
    const component = createComponent();
    component.isReadOnly = true;

    expect(component.canDeactivate('/workplace/shift')).toBe(true);
    expect(hasChangesToLose).not.toHaveBeenCalled();
  });

  it('does not ask a user without the write right', () => {
    canWriteCurrentShift.mockReturnValue(false);

    expect(createComponent().canDeactivate('/workplace/shift')).toBe(true);
  });

  it('does not ask once the session is gone, so the redirect to the login goes through', () => {
    authenticated.mockReturnValue(false);

    expect(createComponent().canDeactivate('/login')).toBe(true);
  });

  it.each(['/error', '/no-access', '/no-access?reason=shift'])('does not ask on the way to %s', (url) => {
    expect(createComponent().canDeactivate(url)).toBe(true);
  });
});
