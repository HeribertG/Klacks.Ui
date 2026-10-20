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
