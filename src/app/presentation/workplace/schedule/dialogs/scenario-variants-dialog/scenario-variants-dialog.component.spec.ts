// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ScenarioVariantsDialogComponent, VARIANTS_DIALOG_VIEW } from './scenario-variants-dialog.component';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ScenarioVariantSourceShiftService } from 'src/app/domain/services/schedule/scenario-variant-source-shift.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

function createVariant(overrides: Partial<IScenarioVariant> = {}): IScenarioVariant {
  return {
    id: 'variant-1',
    name: 'Winter key',
    groupId: 'group-1',
    fromDate: '2026-11-02',
    untilDate: '2026-11-29',
    token: 'variant-token-1',
    status: AnalyseScenarioStatus.Active,
    isExpired: false,
    shiftCount: 4,
    ...overrides,
  };
}

describe('ScenarioVariantsDialogComponent', () => {
  let variants: WritableSignal<IScenarioVariant[]>;
  let canManage: WritableSignal<boolean>;
  let loadFailed: WritableSignal<boolean>;
  let calls: string[];
  let variantService: {
    variants: WritableSignal<IScenarioVariant[]>;
    loadFailed: WritableSignal<boolean>;
    canManage: WritableSignal<boolean>;
    loadVariants: ReturnType<typeof vi.fn>;
    enter: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    loadShifts: ReturnType<typeof vi.fn>;
    deleteShift: ReturnType<typeof vi.fn>;
  };
  let exitScenario: ReturnType<typeof vi.fn>;
  let openModal: ReturnType<typeof vi.fn>;
  let navigation: {
    navigateToNewShift: ReturnType<typeof vi.fn>;
    navigateToEditShift: ReturnType<typeof vi.fn>;
    navigateToCutShift: ReturnType<typeof vi.fn>;
  };
  let selectedGroup: { id: string; name: string } | undefined;
  let dialog: ScenarioVariantsDialogComponent;

  const modal = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);
  const modalAll = (selector: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(selector));
  const click = (selector: string): void => {
    modal(selector)?.click();
    TestBed.tick();
  };
  const type = (selector: string, value: string): void => {
    const input = modal(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
  };
  const openDialog = (): void => {
    dialog.open();
    TestBed.tick();
  };

  beforeEach(() => {
    calls = [];
    variants = signal<IScenarioVariant[]>([createVariant()]);
    canManage = signal(true);
    loadFailed = signal(false);
    selectedGroup = { id: 'group-1', name: 'Hospital' };
    exitScenario = vi.fn(() => calls.push('exitScenario'));
    openModal = vi.fn();
    navigation = { navigateToNewShift: vi.fn(), navigateToEditShift: vi.fn(), navigateToCutShift: vi.fn() };
    variantService = {
      variants,
      loadFailed,
      canManage,
      loadVariants: vi.fn(),
      enter: vi.fn(() => calls.push('enter')),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn().mockReturnValue(of(undefined)),
      loadShifts: vi.fn().mockReturnValue(of([])),
      deleteShift: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [ScenarioVariantsDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ScenarioVariantService, useValue: variantService },
        { provide: AnalyseScenarioService, useValue: { exitScenario } },
        { provide: GroupSelectionService, useValue: { get selectedGroup() { return selectedGroup; } } },
        { provide: NavigationService, useValue: navigation },
        { provide: ModalService, useValue: { openModal } },
        { provide: ScenarioVariantSourceShiftService, useValue: { loadSealedShifts: () => of([]) } },
        { provide: DataManagementGroupService, useValue: { flatNodeList: [] } },
        { provide: ToastShowService, useValue: { showInfo: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ScenarioVariantsDialogComponent);
    fixture.detectChanges();
    dialog = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
  });

  describe('list of keys', () => {
    it('loads the keys of the selected group when it opens', () => {
      // Act
      openDialog();

      // Assert
      expect(variantService.loadVariants).toHaveBeenCalledWith('group-1');
    });

    it('lists name, period, number of shifts and status of each key', () => {
      // Act
      openDialog();

      // Assert
      const row = modal('.variant-row[data-variant-id="variant-1"]');
      expect(row?.textContent).toContain('Winter key');
      expect(row?.textContent).toContain('4');
      expect(row?.textContent).toContain('scenarioVariant.status.active');
      expect(row?.querySelectorAll('td')[1].textContent?.trim().length).toBeGreaterThan(0);
    });

    it('shows the expired badge only for an expired key', () => {
      // Arrange
      variants.set([createVariant({ id: 'old', name: 'Old key', isExpired: true }), createVariant({ id: 'new', name: 'New key' })]);

      // Act
      openDialog();

      // Assert
      expect(modal('.variant-row[data-variant-id="old"] .variant-expired-badge')).not.toBeNull();
      expect(modal('.variant-row[data-variant-id="new"] .variant-expired-badge')).toBeNull();
    });

    it('lists the keys of the subgroups the server answers with', () => {
      // Arrange
      variants.set([createVariant(), createVariant({ id: 'subgroup-key', groupId: 'group-1-a', name: 'Subgroup key' })]);

      // Act
      openDialog();

      // Assert
      expect(modalAll('.variant-row')).toHaveLength(2);
    });

    it('says so when the group has no key', () => {
      // Arrange
      variants.set([]);

      // Act
      openDialog();

      // Assert
      expect(modal('#scenario-variants-empty')).not.toBeNull();
    });

    it('asks for a group first when none is selected', () => {
      // Arrange
      selectedGroup = undefined;

      // Act
      openDialog();

      // Assert
      expect(modal('#scenario-variants-no-group')).not.toBeNull();
      expect(variantService.loadVariants).not.toHaveBeenCalled();
      expect(modal('#scenario-variants-create-btn')).toBeNull();
    });

    it('reports a failed list request', () => {
      // Arrange
      loadFailed.set(true);

      // Act
      openDialog();

      // Assert
      expect(modal('#scenario-variants-load-failed')).not.toBeNull();
    });
  });

  describe('rights', () => {
    it('offers create, edit shifts, copy, edit and delete to a user who may manage keys', () => {
      // Act
      openDialog();

      // Assert
      expect(modal('#scenario-variants-create-btn')).not.toBeNull();
      expect(modal('.variant-edit-shifts-btn')).not.toBeNull();
      expect(modal('.variant-copy-btn')).not.toBeNull();
      expect(modal('.variant-edit-btn')).not.toBeNull();
      expect(modal('.variant-delete-btn')).not.toBeNull();
      expect(modal('#scenario-variants-readonly')).toBeNull();
    });

    it('shows a planner the list read-only: no create, edit, delete, shift edit or copy', () => {
      // Arrange
      canManage.set(false);

      // Act
      openDialog();

      // Assert
      expect(modalAll('.variant-row')).toHaveLength(1);
      expect(modal('#scenario-variants-create-btn')).toBeNull();
      expect(modal('.variant-edit-shifts-btn')).toBeNull();
      expect(modal('.variant-copy-btn')).toBeNull();
      expect(modal('.variant-edit-btn')).toBeNull();
      expect(modal('.variant-delete-btn')).toBeNull();
      expect(modal('.variant-view-shifts-btn')).not.toBeNull();
      expect(modal('#scenario-variants-readonly')).not.toBeNull();
    });

    it('allows no shift edit, copy, change or delete on a key that is no longer active, only to look at it', () => {
      // Arrange
      variants.set([createVariant({ status: AnalyseScenarioStatus.Accepted })]);

      // Act
      openDialog();

      // Assert
      expect(modal('.variant-edit-shifts-btn')).toBeNull();
      expect(modal('.variant-copy-btn')).toBeNull();
      expect(modal('.variant-edit-btn')).toBeNull();
      expect(modal('.variant-view-shifts-btn')).not.toBeNull();
      expect(modal('.variant-delete-btn')).toBeNull();
    });

    it('does not start variant mode for a planner', () => {
      // Arrange
      canManage.set(false);
      openDialog();

      // Act
      dialog.onEditShifts(createVariant());

      // Assert
      expect(variantService.enter).not.toHaveBeenCalled();
      expect(exitScenario).not.toHaveBeenCalled();
    });
  });

  describe('create and change a key', () => {
    it('creates a key in the selected group and returns to the list', () => {
      // Arrange
      variantService.create.mockReturnValue(of(createVariant({ id: 'variant-new' })));
      openDialog();
      click('#scenario-variants-create-btn');
      type('#scenario-variant-name-input', 'Big order');
      type('#scenario-variant-from-input', '2026-12-01');
      type('#scenario-variant-until-input', '2026-12-31');

      // Act
      click('#scenario-variant-form-save');

      // Assert
      expect(variantService.create).toHaveBeenCalledWith({
        name: 'Big order',
        description: undefined,
        groupId: 'group-1',
        fromDate: '2026-12-01',
        untilDate: '2026-12-31',
      });
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.List);
    });

    it('cannot save without a name', () => {
      // Arrange
      openDialog();
      click('#scenario-variants-create-btn');

      // Assert
      expect((modal('#scenario-variant-form-save') as HTMLButtonElement).disabled).toBe(true);
    });

    it('cannot save a period that ends before it starts and says why', () => {
      // Arrange
      openDialog();
      click('#scenario-variants-create-btn');
      type('#scenario-variant-name-input', 'Big order');
      type('#scenario-variant-from-input', '2026-12-31');
      type('#scenario-variant-until-input', '2026-12-01');

      // Assert
      expect((modal('#scenario-variant-form-save') as HTMLButtonElement).disabled).toBe(true);
      expect(modal('#scenario-variant-form-invalid')).not.toBeNull();
    });

    it('fills the form with the key when it is changed and sends an update', () => {
      // Arrange
      variantService.update.mockReturnValue(of(createVariant({ name: 'Renamed' })));
      openDialog();
      click('.variant-edit-btn');

      // Assert
      expect(dialog.formName()).toBe('Winter key');
      expect(dialog.fromDate()).toBe('2026-11-02');
      expect(dialog.untilDate()).toBe('2026-11-29');

      // Act
      type('#scenario-variant-name-input', 'Renamed');
      click('#scenario-variant-form-save');

      // Assert
      expect(variantService.update).toHaveBeenCalledWith('variant-1', {
        name: 'Renamed',
        description: undefined,
        fromDate: '2026-11-02',
        untilDate: '2026-11-29',
      });
    });

    it('explains a period that would leave shifts of the key outside and keeps the input', () => {
      // Arrange
      variantService.update.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 409,
          error: { detail: 'English', errorCode: 'SCENARIO_VARIANT_SHIFTS_OUTSIDE_PERIOD' },
        })),
      );
      openDialog();
      dialog.onEdit(dialog.groupVariants()[0]);
      TestBed.tick();
      type('#scenario-variant-name-input', 'Shorter');

      // Act
      click('#scenario-variant-form-save');

      // Assert
      expect(variantService.update).toHaveBeenCalledTimes(1);
      expect(modal('#scenario-variants-error')?.textContent).toContain('scenarioVariant.error.shiftsOutsidePeriod');
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.Form);
      expect(dialog.formName()).toBe('Shorter');
    });

    it('explains a refused save in the dialog and stays on the form', () => {
      // Arrange
      variantService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Period is invalid' } })));
      openDialog();
      click('#scenario-variants-create-btn');
      type('#scenario-variant-name-input', 'Big order');

      // Act
      click('#scenario-variant-form-save');

      // Assert
      expect(modal('#scenario-variants-error')?.textContent).toContain('scenarioVariant.error.invalid');
      expect(modal('#scenario-variants-error')?.textContent).not.toContain('Period is invalid');
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.Form);
    });
  });

  describe('delete', () => {
    it('asks for confirmation and removes the key only after it', () => {
      // Arrange
      openDialog();

      // Act
      click('.variant-delete-btn');

      // Assert
      expect(openModal).toHaveBeenCalledTimes(1);
      expect(openModal.mock.calls[0][0].type).toBe(ModalType.Delete);
      expect(variantService.remove).not.toHaveBeenCalled();

      // Act
      openModal.mock.calls[0][0].onConfirm();

      // Assert
      expect(variantService.remove).toHaveBeenCalledWith('variant-1');
    });

    it('explains a refused delete, for example while an active scenario still uses the key', () => {
      // Arrange
      variantService.remove.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'In use', errorCode: 'SCENARIO_VARIANT_IN_USE' } })));
      openDialog();
      click('.variant-delete-btn');

      // Act
      openModal.mock.calls[0][0].onConfirm();
      TestBed.tick();

      // Assert
      expect(modal('#scenario-variants-error')?.textContent).toContain('scenarioVariant.error.inUse');
    });
  });

  describe('edit shifts', () => {
    it('leaves scenario mode first, then enters variant mode and shows the shifts of the key', () => {
      // Arrange
      openDialog();

      // Act
      click('.variant-edit-shifts-btn');

      // Assert
      expect(calls).toEqual(['exitScenario', 'enter']);
      expect(variantService.enter).toHaveBeenCalledWith(createVariant());
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.Shifts);
      expect(variantService.loadShifts).toHaveBeenCalledWith('variant-1');
      expect(modal('#variant-shifts-panel')).not.toBeNull();
    });

    it('lets a planner look at the shifts without entering variant mode', () => {
      // Arrange
      canManage.set(false);
      openDialog();

      // Act
      click('.variant-view-shifts-btn');

      // Assert
      expect(variantService.enter).not.toHaveBeenCalled();
      expect(modal('#variant-shifts-panel')).not.toBeNull();
      expect(modal('#variant-shifts-new-btn')).toBeNull();
    });

    it('opens the new-shift screen from the shifts panel', () => {
      // Arrange
      openDialog();
      click('.variant-edit-shifts-btn');

      // Act
      click('#variant-shifts-new-btn');

      // Assert
      expect(navigation.navigateToNewShift).toHaveBeenCalledTimes(1);
    });

    it('opens the edit and the cut screen of a shift', () => {
      // Act
      dialog.onEditShift('order-1');
      dialog.onCutShift('order-1');

      // Assert
      expect(navigation.navigateToEditShift).toHaveBeenCalledWith('order-1');
      expect(navigation.navigateToCutShift).toHaveBeenCalledWith('order-1');
    });

    it('returns from the shifts to the list of keys', () => {
      // Arrange
      openDialog();
      click('.variant-edit-shifts-btn');

      // Act
      click('#variant-shifts-back-btn');

      // Assert
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.List);
      expect(modalAll('.variant-row')).toHaveLength(1);
    });
  });

  describe('copy shifts', () => {
    it('opens the copy panel for an active key', () => {
      // Arrange
      openDialog();

      // Act
      click('.variant-copy-btn');

      // Assert
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.Copy);
      expect(modal('#variant-copy-panel')).not.toBeNull();
    });

    it('does not copy into a key for a planner', () => {
      // Arrange
      canManage.set(false);
      openDialog();

      // Act
      dialog.onCopyShifts(createVariant());

      // Assert
      expect(dialog.view()).toBe(VARIANTS_DIALOG_VIEW.List);
    });
  });
});
