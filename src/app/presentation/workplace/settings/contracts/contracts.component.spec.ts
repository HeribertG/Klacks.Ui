// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmbeddedViewRef, EventEmitter, signal, ViewContainerRef, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ContractsComponent } from './contracts.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { DataManagementMonthlyTargetHoursService } from 'src/app/domain/services/scheduling/data-management-monthly-target-hours.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection.interface';

describe('ContractsComponent', () => {
  let component: ContractsComponent;
  let fixture: ComponentFixture<ContractsComponent>;
  let mockDataManagementContractService: Partial<DataManagementContractService>;
  let mockMonthlyTargetHoursService: Partial<DataManagementMonthlyTargetHoursService>;
  let mockSettingsService: Partial<DataManagementSettingsService>;
  let mockModalService: Partial<ModalService>;
  let mockNgbModal: Partial<NgbModal>;
  let mockTranslateService: Partial<TranslateService>;

  const mockContract: IContract = {
    id: '1',
    name: 'Test Contract',
    guaranteedHours: 170,
    minimumHours: 160,
    maximumHours: 200,
    fullTime: 180,
    nightRate: 0.1,
    holidayRate: 0.15,
    we1Rate: 0.1,
    we2Rate: 0.1,
    we3Rate: 0.1,
    nightStart: '23:00',
    nightEnd: '06:00',
    paymentInterval: PaymentInterval.Monthly,
    percent: undefined,
    validFrom: new Date(2024, 0, 1),
    validUntil: new Date(2024, 11, 31),
    calendarSelection: undefined,
    calendarSelectionId: 'cal-1',
    schedulingRuleId: undefined,
    individualPeriodId: undefined,
    workOnMonday: true,
    workOnTuesday: true,
    workOnWednesday: true,
    workOnThursday: true,
    workOnFriday: true,
    workOnSaturday: false,
    workOnSunday: false,
    performsShiftWork: false,
  };

  beforeEach(async () => {
    mockDataManagementContractService = {
      contracts: [],
      availableCalendars: [],
      availableSchedulingRules: [],
      availableIndividualPeriods: [],
      init: vi.fn().mockResolvedValue(undefined),
      createContract: vi.fn(),
      prepareContractForEdit: vi.fn(),
      saveExistingContract: vi.fn().mockResolvedValue(true),
      deleteContract: vi.fn().mockResolvedValue(true),
      readContracts: vi.fn().mockResolvedValue([]),
      validateContract: vi.fn().mockReturnValue([]),
      loadIndividualPeriods: vi.fn().mockResolvedValue(undefined),
      ensureAssignedSchedulingRuleIsSelectable: vi.fn().mockResolvedValue(undefined),
      isRead: signal(false),
    };

    mockMonthlyTargetHoursService = {
      init: vi.fn().mockResolvedValue(undefined),
      hoursOf: vi.fn().mockReturnValue(undefined),
    };

    mockSettingsService = {
      appSettings: {
        schedulingDefaultSettings: signal({ guaranteedHours: 170, fullTime: 190 }),
      },
    } as unknown as Partial<DataManagementSettingsService>;

    mockModalService = {
      resultEvent: new Subject<ModalType>(),
      Filing: '',
      componentContext: '',
      deleteMessage: '',
      setDefault: vi.fn(),
      openModel: vi.fn(),
    };

    mockNgbModal = {
      open: vi.fn().mockReturnValue({ close: vi.fn(), dismiss: vi.fn() }),
    };

    mockTranslateService = {
      instant: vi.fn().mockImplementation((key: string) => key),
      get: vi.fn().mockImplementation((key: string) => of(key)),
      onTranslationChange: new EventEmitter(),
      onLangChange: new EventEmitter(),
      onDefaultLangChange: new EventEmitter(),
    };

    await TestBed.configureTestingModule({
      imports: [
        ContractsComponent,
        TranslateModule.forRoot(),
        NgbModule,
      ],
      providers: [
        { provide: DataManagementContractService, useValue: mockDataManagementContractService },
        { provide: DataManagementMonthlyTargetHoursService, useValue: mockMonthlyTargetHoursService },
        { provide: DataManagementSettingsService, useValue: mockSettingsService },
        { provide: ModalService, useValue: mockModalService },
        { provide: NgbModal, useValue: mockNgbModal },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  const state = () => component;
  const hours = () => component;
  const validity = () => component;
  const payment = () => component;
  const assignment = () => component;
  const shiftWork = () => component;
  const list = () => component;
  const session = () => component;

  it('should create', () => {
    // Arrange & Act & Assert
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize the data management service', async () => {
      // Arrange & Act
      await component.ngOnInit();

      // Assert
      expect(mockDataManagementContractService.init).toHaveBeenCalled();
    });
  });

  describe('contracts list reactivity (regression)', () => {
    it('filteredContracts reflects the loaded contracts after ngOnInit', async () => {
      mockDataManagementContractService.contracts = [mockContract];

      await component.ngOnInit();

      expect(list().filteredContracts()).toEqual([mockContract]);
    });

    it('filteredContracts updates reactively when the service signals a read', () => {
      fixture.detectChanges();
      expect(list().filteredContracts().length).toBe(0);

      mockDataManagementContractService.contracts = [mockContract];
      (mockDataManagementContractService.isRead as WritableSignal<boolean>).set(true);
      fixture.detectChanges();

      expect(list().filteredContracts()).toEqual([mockContract]);
    });
  });

  describe('Signal Form Methods', () => {
    beforeEach(() => {
      state().editingContract = { ...mockContract };
    });

    it('onGuaranteedHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('180', '30');

      // Act
      hours().onGuaranteedHoursChange(newHours);

      // Assert
      expect(state().guaranteedHours()).toEqual(newHours);
      expect(state().editingContract!.guaranteedHours).toBe(180.5);
    });

    it('onMinimumHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('150', '00');

      // Act
      hours().onMinimumHoursChange(newHours);

      // Assert
      expect(state().minimumHours()).toEqual(newHours);
      expect(state().editingContract!.minimumHours).toBe(150);
    });

    it('onMaximumHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('220', '00');

      // Act
      hours().onMaximumHoursChange(newHours);

      // Assert
      expect(state().maximumHours()).toEqual(newHours);
      expect(state().editingContract!.maximumHours).toBe(220);
    });

    it('onFullTimeChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('173', '20');

      // Act
      hours().onFullTimeChange(newHours);

      // Assert
      expect(state().fullTime()).toEqual(newHours);
    });

    it('onValidFromChange should update signal and editingContract', () => {
      // Arrange
      const newDate = { year: 2025, month: 6, day: 15 };

      // Act
      validity().onValidFromChange(newDate);

      // Assert
      expect(state().validFrom()).toEqual(newDate);
      expect(state().editingContract!.validFrom).toBeTruthy();
    });

    it('onValidUntilChange should update signal and editingContract', () => {
      // Arrange
      const newDate = { year: 2025, month: 12, day: 31 };

      // Act
      validity().onValidUntilChange(newDate);

      // Assert
      expect(state().validUntil()).toEqual(newDate);
      expect(state().editingContract!.validUntil).toBeTruthy();
    });

    it('onValidUntilChange with null should clear validUntil', () => {
      // Arrange
      state().editingContract!.validUntil = new Date();

      // Act
      validity().onValidUntilChange(null);

      // Assert
      expect(state().validUntil()).toBeNull();
      expect(state().editingContract!.validUntil).toBeUndefined();
    });
  });

  describe('Inherited guaranteed hours', () => {
    it('onClickEdit with undefined guaranteedHours enters the inherited state', () => {
      const contract = { ...mockContract, guaranteedHours: undefined };

      session().onClickEdit(contract);

      expect(state().guaranteedHoursInherited()).toBe(true);
    });

    it('onClickEdit with explicit zero stays explicit', () => {
      const contract = { ...mockContract, guaranteedHours: 0 };

      session().onClickEdit(contract);

      expect(state().guaranteedHoursInherited()).toBe(false);
    });

    it('typing a value leaves the inherited state', () => {
      session().onClickEdit({ ...mockContract, guaranteedHours: undefined });

      hours().onGuaranteedHoursChange(OwnTime.forDuration('160', '00'));

      expect(state().guaranteedHoursInherited()).toBe(false);
      expect(state().editingContract!.guaranteedHours).toBe(160);
    });

    it('resetGuaranteedHoursToCompanyValue writes undefined to the contract', () => {
      session().onClickEdit({ ...mockContract, guaranteedHours: 170 });

      hours().resetGuaranteedHoursToCompanyValue();

      expect(state().guaranteedHoursInherited()).toBe(true);
      expect(state().editingContract!.guaranteedHours).toBeUndefined();
    });

    it('isFormValid keeps undefined guaranteedHours while inherited', () => {
      session().onClickEdit({ ...mockContract, guaranteedHours: undefined });

      state().isFormValid();

      expect(state().editingContract!.guaranteedHours).toBeUndefined();
    });

    it('inherited display uses the monthly value of the current month scaled by percent', () => {
      (mockMonthlyTargetHoursService.hoursOf as ReturnType<typeof vi.fn>).mockReturnValue(168);

      return component.ngOnInit().then(() => {
        state().percent.set(50);

        expect(hours().inheritedGuaranteedHours()).toBe(84);
        expect(hours().inheritedGuaranteedHoursDisplay()).toBe('84:00');
      });
    });

    it('inherited display falls back to the settings value without a monthly row', async () => {
      await component.ngOnInit();
      state().percent.set(undefined);

      expect(hours().inheritedGuaranteedHours()).toBe(170);
      expect(hours().inheritedGuaranteedHoursDisplay()).toBe('170:00');
    });

    it('showPercentField is true while inherited even on the monthly interval', () => {
      session().onClickEdit({ ...mockContract, guaranteedHours: undefined });

      expect(payment().showPercentField()).toBe(true);
    });

    it('showPercentField is false for an explicit contract on the monthly interval', () => {
      session().onClickEdit({ ...mockContract, guaranteedHours: 170 });

      expect(payment().showPercentField()).toBe(false);
    });

    it('leaving the target-hours interval keeps percent while inherited', () => {
      session().onClickEdit({
        ...mockContract,
        guaranteedHours: undefined,
        paymentInterval: PaymentInterval.MonthlyTargetHours,
        percent: 60,
      });

      payment().onPaymentIntervalChange(PaymentInterval.Monthly);

      expect(state().percent()).toBe(60);
      expect(state().editingContract!.percent).toBe(60);
    });

    describe('rendered in the modal template', () => {
      let modalView: EmbeddedViewRef<unknown>;

      const queryModal = <T extends Element>(selector: string): T | null => {
        for (const node of modalView.rootNodes as Element[]) {
          if (typeof node.querySelector !== 'function') continue;
          if (node.matches?.(selector)) return node as unknown as T;
          const hit = node.querySelector(selector);
          if (hit) return hit as T;
        }
        return null;
      };

      const renderModal = () => {
        fixture.detectChanges();
        const viewContainer = fixture.debugElement.injector.get(ViewContainerRef);
        modalView = viewContainer.createEmbeddedView(component.contractModal(), {
          $implicit: { close: () => undefined, dismiss: () => undefined },
        });
        fixture.detectChanges();
      };

      afterEach(() => modalView.destroy());

      it('hides min/max/full-time when guaranteed hours are inherited', () => {
        session().onClickEdit({ ...mockContract, guaranteedHours: undefined });
        renderModal();

        expect(queryModal('#contract-modal-guaranteed-hours-item')).not.toBeNull();
        expect(queryModal('#contract-modal-min-hours-item')).toBeNull();
        expect(queryModal('#contract-modal-max-hours-item')).toBeNull();
        expect(queryModal('#contract-modal-fulltime-item')).toBeNull();
      });

      it('shows min/max/full-time when guaranteed hours are explicit', () => {
        session().onClickEdit({ ...mockContract, guaranteedHours: 170 });
        renderModal();

        expect(queryModal('#contract-modal-min-hours-item')).not.toBeNull();
        expect(queryModal('#contract-modal-max-hours-item')).not.toBeNull();
        expect(queryModal('#contract-modal-fulltime-item')).not.toBeNull();
      });

      it('shows the company default as a grey placeholder when full-time is empty', () => {
        session().onClickEdit({ ...mockContract, guaranteedHours: 170, fullTime: 0 });
        renderModal();

        const hoursInput = queryModal<HTMLInputElement>('#fullTime');
        expect(hoursInput).not.toBeNull();
        expect(hoursInput!.placeholder).toBe('190');
        expect(hoursInput!.classList.contains('inherited-placeholder')).toBe(true);
        expect(hoursInput!.value).toBe('');
      });

      it('shows the contract value, not the company placeholder, when full-time is set', () => {
        session().onClickEdit({ ...mockContract, guaranteedHours: 170, fullTime: 180 });
        renderModal();

        const hoursInput = queryModal<HTMLInputElement>('#fullTime');
        expect(hoursInput).not.toBeNull();
        expect(hoursInput!.classList.contains('inherited-placeholder')).toBe(false);
        expect(hoursInput!.value).toBe('180');
      });
    });
  });

  describe('Full-time placeholder', () => {
    it('fullTimeIsEmpty is true when the contract full-time is zero', () => {
      session().onClickEdit({ ...mockContract, fullTime: 0 });

      expect(hours().fullTimeIsEmpty()).toBe(true);
    });

    it('fullTimeIsEmpty is false when the contract full-time is set', () => {
      session().onClickEdit({ ...mockContract, fullTime: 180 });

      expect(hours().fullTimeIsEmpty()).toBe(false);
    });

    it('companyFullTimeTime reflects the company-wide default setting', () => {
      expect(hours().companyFullTimeTime()).toEqual(OwnTime.forDuration('190', '00'));
    });
  });

  describe('onSaveModal', () => {
    it('does not close the modal when validation fails', async () => {
      state().editingContract = { ...mockContract };
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue(['Error']);
      const modal = { close: vi.fn(), dismiss: vi.fn() };

      await session().onSaveModal(modal);

      expect(modal.close).not.toHaveBeenCalled();
      expect(mockDataManagementContractService.saveExistingContract).not.toHaveBeenCalled();
    });

    it('closes the modal when the save succeeds', async () => {
      session().onClickEdit({ ...mockContract });
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const modal = { close: vi.fn(), dismiss: vi.fn() };

      await session().onSaveModal(modal);

      expect(mockDataManagementContractService.saveExistingContract).toHaveBeenCalled();
      expect(modal.close).toHaveBeenCalled();
    });

    it('keeps the modal open when the service save fails', async () => {
      session().onClickEdit({ ...mockContract });
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (mockDataManagementContractService.saveExistingContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const modal = { close: vi.fn(), dismiss: vi.fn() };

      await session().onSaveModal(modal);

      expect(modal.close).not.toHaveBeenCalled();
    });
  });

  describe('Calendar Selection', () => {
    beforeEach(() => {
      state().editingContract = { ...mockContract };
      mockDataManagementContractService.availableCalendars = [
        { id: 'cal-1', name: 'Calendar 1' },
        { id: 'cal-2', name: 'Calendar 2' },
      ] as Partial<ICalendarSelection>[] as ICalendarSelection[];
    });

    it('onCalendarSelectionChange should update editingContract with selected calendar', () => {
      // Arrange
      const calendarId = 'cal-2';

      // Act
      assignment().onCalendarSelectionChange(calendarId);

      // Assert
      expect(state().calendarSelectionId()).toBe(calendarId);
      expect(state().editingContract!.calendarSelectionId).toBe(calendarId);
    });

    it('onCalendarSelectionChange with empty string should clear calendar selection', () => {
      // Arrange & Act
      assignment().onCalendarSelectionChange('');

      // Assert
      expect(state().calendarSelectionId()).toBeUndefined();
      expect(state().editingContract!.calendarSelectionId).toBeUndefined();
      expect(state().editingContract!.calendarSelection).toBeUndefined();
    });

    it('getSelectedCalendarName should return calendar name when selected', () => {
      // Arrange
      state().calendarSelectionId.set('cal-1');

      // Act
      const result = assignment().getSelectedCalendarName();

      // Assert
      expect(result).toBe('Calendar 1');
    });

    it('getSelectedCalendarName should return translation key when no calendar selected', () => {
      // Arrange
      state().calendarSelectionId.set(undefined);

      // Act
      assignment().getSelectedCalendarName();

      // Assert
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.contract.noCalendar');
    });
  });

  describe('Validation', () => {
    it('isFormValid should return true when no validation errors', () => {
      // Arrange
      state().editingContract = { ...mockContract };
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue([]);

      // Act
      const result = state().isFormValid();

      // Assert
      expect(result).toBe(true);
    });

    it('isFormValid should return false when validation errors exist', () => {
      // Arrange
      state().editingContract = { ...mockContract };
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue(['Error 1']);

      // Act
      const result = state().isFormValid();

      // Assert
      expect(result).toBe(false);
    });

    it('isFormValid should return false when no editingContract', () => {
      // Arrange
      state().editingContract = null;

      // Act
      const result = state().isFormValid();

      // Assert
      expect(result).toBe(false);
    });

    it('getValidationErrors should return errors from service', () => {
      // Arrange
      state().editingContract = { ...mockContract };
      const errors = ['Error 1', 'Error 2'];
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue(errors);

      // Act
      const result = state().getValidationErrors();

      // Assert
      expect(result).toEqual(errors);
    });

    it('getValidationErrors should return empty array when no editingContract', () => {
      // Arrange
      state().editingContract = null;

      // Act
      const result = state().getValidationErrors();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Add Contract', () => {
    it('onClickAdd should create new contract and set editing state', () => {
      // Arrange
      vi.useFakeTimers();
      const newContract: IContract = { name: '', guaranteedHours: 0 } as IContract;
      (mockDataManagementContractService.createContract as ReturnType<typeof vi.fn>).mockReturnValue(newContract);
      fixture.detectChanges();

      // Act
      session().onClickAdd();
      vi.advanceTimersByTime(0);

      // Assert
      expect(mockDataManagementContractService.createContract).toHaveBeenCalled();
      expect(state().editingContract).toBe(newContract);
      expect(state().isNewContract).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Edit Contract', () => {
    it('onClickEdit should clone contract and set editing state', () => {
      // Arrange
      const contract = { ...mockContract };

      // Act
      session().onClickEdit(contract);

      // Assert
      expect(mockDataManagementContractService.prepareContractForEdit).toHaveBeenCalled();
      expect(state().editingContract).not.toBe(contract);
      expect(state().editingContract!.name).toBe(contract.name);
      expect(state().isNewContract).toBe(false);
      expect(state().originalContract).toBe(contract);
    });
  });

  describe('Delete Contract', () => {
    it('openDeleteContract should open delete modal for valid index', () => {
      // Arrange
      mockDataManagementContractService.contracts = [mockContract];

      // Act
      list().openDeleteContract(0);

      // Assert
      expect(mockModalService.componentContext).toBe('contracts');
      expect(mockModalService.Filing).toBe('0');
      expect(mockModalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('openDeleteContract should not open modal for invalid index', () => {
      // Arrange
      mockDataManagementContractService.contracts = [mockContract];

      // Act
      list().openDeleteContract(5);

      // Assert
      expect(mockModalService.openModel).not.toHaveBeenCalled();
    });
  });

  describe('Standard rates and tri-state shift work', () => {
    let modalView: EmbeddedViewRef<unknown> | undefined;

    const queryModal = <T extends Element>(selector: string): T | null => {
      for (const node of (modalView?.rootNodes ?? []) as Element[]) {
        if (typeof node.querySelector !== 'function') continue;
        if (node.matches?.(selector)) return node as unknown as T;
        const hit = node.querySelector(selector);
        if (hit) return hit as T;
      }
      return null;
    };

    const renderModal = () => {
      fixture.detectChanges();
      const viewContainer = fixture.debugElement.injector.get(ViewContainerRef);
      modalView = viewContainer.createEmbeddedView(component.contractModal(), {
        $implicit: { close: () => undefined, dismiss: () => undefined },
      });
      fixture.detectChanges();
    };

    afterEach(() => {
      modalView?.destroy();
      modalView = undefined;
    });

    it('keeps standard (null) rates null and explicit zero at zero when saving', () => {
      session().onClickEdit({
        ...mockContract,
        nightRate: null,
        holidayRate: 0,
        we1Rate: null,
        we2Rate: 0,
        we3Rate: 25,
      });

      state().isFormValid();

      expect(state().editingContract!.nightRate).toBeNull();
      expect(state().editingContract!.holidayRate).toBe(0);
      expect(state().editingContract!.we1Rate).toBeNull();
      expect(state().editingContract!.we2Rate).toBe(0);
      expect(state().editingContract!.we3Rate).toBe(25);
    });

    it('a cleared rate input saves as standard (null), a typed 0 saves as 0', () => {
      session().onClickEdit({ ...mockContract, nightRate: 10, holidayRate: 15 });
      renderModal();

      const night = queryModal<HTMLInputElement>('#nightRate')!;
      const holiday = queryModal<HTMLInputElement>('#holidayRate')!;
      night.value = '';
      night.dispatchEvent(new Event('input'));
      holiday.value = '0';
      holiday.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      state().isFormValid();

      expect(state().editingContract!.nightRate).toBeNull();
      expect(state().editingContract!.holidayRate).toBe(0);
    });

    it('shows the standard placeholder in an empty rate input', () => {
      session().onClickEdit({ ...mockContract, nightRate: null });
      renderModal();

      const night = queryModal<HTMLInputElement>('#nightRate')!;
      expect(night.value).toBe('');
      expect(night.placeholder).toBe('setting.contract.rate-standard-placeholder');
    });

    it('clamps an explicit rate above 100 percent but leaves standard untouched', () => {
      session().onClickEdit({ ...mockContract, nightRate: 150, holidayRate: null });
      fixture.detectChanges();

      state().isFormValid();

      expect(state().editingContract!.nightRate).toBe(100);
      expect(state().editingContract!.holidayRate).toBeNull();
    });

    it('cycles shift work through standard, yes and no and writes it to the contract', () => {
      session().onClickEdit({ ...mockContract, performsShiftWork: null });
      expect(shiftWork().isShiftWorkUnset()).toBe(true);
      expect(shiftWork().shiftWorkTooltipKey()).toBe('setting.contract.performsShiftWork-unset');

      shiftWork().cycleShiftWork();
      expect(state().editingContract!.performsShiftWork).toBe(true);
      expect(shiftWork().shiftWorkTooltipKey()).toBe('setting.contract.performsShiftWork-enabled');

      shiftWork().cycleShiftWork();
      expect(state().editingContract!.performsShiftWork).toBe(false);
      expect(shiftWork().shiftWorkTooltipKey()).toBe('setting.contract.performsShiftWork-disabled');

      shiftWork().cycleShiftWork();
      expect(state().editingContract!.performsShiftWork).toBeNull();

      state().isFormValid();
      expect(state().editingContract!.performsShiftWork).toBeNull();
    });

    it('renders standard shift work as an indeterminate checkbox and cycles on click', () => {
      session().onClickEdit({ ...mockContract, performsShiftWork: null });
      renderModal();

      const checkbox = queryModal<HTMLInputElement>('#contract-modal-performs-shift-work')!;
      expect(checkbox.indeterminate).toBe(true);

      checkbox.click();
      fixture.detectChanges();

      expect(state().editingContract!.performsShiftWork).toBe(true);
      expect(checkbox.checked).toBe(true);
      expect(checkbox.indeterminate).toBe(false);
    });
  });
});
