// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ContractsComponent } from './contracts.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { IContract, PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection-class';

describe('ContractsComponent', () => {
  let component: ContractsComponent;
  let fixture: ComponentFixture<ContractsComponent>;
  let mockDataManagementContractService: Partial<DataManagementContractService>;
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
    saRate: 0.1,
    soRate: 0.1,
    paymentInterval: PaymentInterval.Monthly,
    validFrom: new Date(2024, 0, 1),
    validUntil: new Date(2024, 11, 31),
    calendarSelection: undefined,
    calendarSelectionId: 'cal-1',
    schedulingRuleId: undefined,
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
      init: vi.fn().mockResolvedValue(undefined),
      createContract: vi.fn(),
      prepareContractForEdit: vi.fn(),
      saveExistingContract: vi.fn().mockResolvedValue(true),
      deleteContract: vi.fn().mockResolvedValue(true),
      readContracts: vi.fn().mockResolvedValue([]),
      validateContract: vi.fn().mockReturnValue([]),
      isRead: signal(false),
    };

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

  describe('Signal Form Methods', () => {
    beforeEach(() => {
      component.editingContract = { ...mockContract };
    });

    it('onGuaranteedHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('180', '30');

      // Act
      component.onGuaranteedHoursChange(newHours);

      // Assert
      expect(component.guaranteedHours()).toEqual(newHours);
      expect(component.editingContract!.guaranteedHours).toBe(180.5);
    });

    it('onMinimumHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('150', '00');

      // Act
      component.onMinimumHoursChange(newHours);

      // Assert
      expect(component.minimumHours()).toEqual(newHours);
      expect(component.editingContract!.minimumHours).toBe(150);
    });

    it('onMaximumHoursChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('220', '00');

      // Act
      component.onMaximumHoursChange(newHours);

      // Assert
      expect(component.maximumHours()).toEqual(newHours);
      expect(component.editingContract!.maximumHours).toBe(220);
    });

    it('onFullTimeChange should update signal and editingContract', () => {
      // Arrange
      const newHours = OwnTime.forDuration('173', '20');

      // Act
      component.onFullTimeChange(newHours);

      // Assert
      expect(component.fullTime()).toEqual(newHours);
    });

    it('onValidFromChange should update signal and editingContract', () => {
      // Arrange
      const newDate = { year: 2025, month: 6, day: 15 };

      // Act
      component.onValidFromChange(newDate);

      // Assert
      expect(component.validFrom()).toEqual(newDate);
      expect(component.editingContract!.validFrom).toBeTruthy();
    });

    it('onValidUntilChange should update signal and editingContract', () => {
      // Arrange
      const newDate = { year: 2025, month: 12, day: 31 };

      // Act
      component.onValidUntilChange(newDate);

      // Assert
      expect(component.validUntil()).toEqual(newDate);
      expect(component.editingContract!.validUntil).toBeTruthy();
    });

    it('onValidUntilChange with null should clear validUntil', () => {
      // Arrange
      component.editingContract!.validUntil = new Date();

      // Act
      component.onValidUntilChange(null);

      // Assert
      expect(component.validUntil()).toBeNull();
      expect(component.editingContract!.validUntil).toBeUndefined();
    });
  });

  describe('Calendar Selection', () => {
    beforeEach(() => {
      component.editingContract = { ...mockContract };
      mockDataManagementContractService.availableCalendars = [
        { id: 'cal-1', name: 'Calendar 1' },
        { id: 'cal-2', name: 'Calendar 2' },
      ] as Partial<ICalendarSelection>[] as ICalendarSelection[];
    });

    it('onCalendarSelectionChange should update editingContract with selected calendar', () => {
      // Arrange
      const calendarId = 'cal-2';

      // Act
      component.onCalendarSelectionChange(calendarId);

      // Assert
      expect(component.calendarSelectionId()).toBe(calendarId);
      expect(component.editingContract!.calendarSelectionId).toBe(calendarId);
    });

    it('onCalendarSelectionChange with empty string should clear calendar selection', () => {
      // Arrange & Act
      component.onCalendarSelectionChange('');

      // Assert
      expect(component.calendarSelectionId()).toBeUndefined();
      expect(component.editingContract!.calendarSelectionId).toBeUndefined();
      expect(component.editingContract!.calendarSelection).toBeUndefined();
    });

    it('getSelectedCalendarName should return calendar name when selected', () => {
      // Arrange
      component.calendarSelectionId.set('cal-1');

      // Act
      const result = component.getSelectedCalendarName();

      // Assert
      expect(result).toBe('Calendar 1');
    });

    it('getSelectedCalendarName should return translation key when no calendar selected', () => {
      // Arrange
      component.calendarSelectionId.set(undefined);

      // Act
      component.getSelectedCalendarName();

      // Assert
      expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.contract.noCalendar');
    });
  });

  describe('Validation', () => {
    it('isFormValid should return true when no validation errors', () => {
      // Arrange
      component.editingContract = { ...mockContract };
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue([]);

      // Act
      const result = component.isFormValid();

      // Assert
      expect(result).toBe(true);
    });

    it('isFormValid should return false when validation errors exist', () => {
      // Arrange
      component.editingContract = { ...mockContract };
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue(['Error 1']);

      // Act
      const result = component.isFormValid();

      // Assert
      expect(result).toBe(false);
    });

    it('isFormValid should return false when no editingContract', () => {
      // Arrange
      component.editingContract = null;

      // Act
      const result = component.isFormValid();

      // Assert
      expect(result).toBe(false);
    });

    it('getValidationErrors should return errors from service', () => {
      // Arrange
      component.editingContract = { ...mockContract };
      const errors = ['Error 1', 'Error 2'];
      (mockDataManagementContractService.validateContract as ReturnType<typeof vi.fn>).mockReturnValue(errors);

      // Act
      const result = component.getValidationErrors();

      // Assert
      expect(result).toEqual(errors);
    });

    it('getValidationErrors should return empty array when no editingContract', () => {
      // Arrange
      component.editingContract = null;

      // Act
      const result = component.getValidationErrors();

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
      component.onClickAdd();
      vi.advanceTimersByTime(0);

      // Assert
      expect(mockDataManagementContractService.createContract).toHaveBeenCalled();
      expect(component.editingContract).toBe(newContract);
      expect(component.isNewContract).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Edit Contract', () => {
    it('onClickEdit should clone contract and set editing state', () => {
      // Arrange
      const contract = { ...mockContract };

      // Act
      component.onClickEdit(contract);

      // Assert
      expect(mockDataManagementContractService.prepareContractForEdit).toHaveBeenCalled();
      expect(component.editingContract).not.toBe(contract);
      expect(component.editingContract!.name).toBe(contract.name);
      expect(component.isNewContract).toBe(false);
      expect(component.originalContract).toBe(contract);
    });
  });

  describe('Delete Contract', () => {
    it('openDeleteContract should open delete modal for valid index', () => {
      // Arrange
      mockDataManagementContractService.contracts = [mockContract];

      // Act
      component.openDeleteContract(0);

      // Assert
      expect(mockModalService.componentContext).toBe('contracts');
      expect(mockModalService.Filing).toBe('0');
      expect(mockModalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('openDeleteContract should not open modal for invalid index', () => {
      // Arrange
      mockDataManagementContractService.contracts = [mockContract];

      // Act
      component.openDeleteContract(5);

      // Assert
      expect(mockModalService.openModel).not.toHaveBeenCalled();
    });
  });
});
