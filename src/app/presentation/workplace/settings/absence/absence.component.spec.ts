// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';

import { AbsenceComponent } from './absence.component';
import { DataManagementAbsenceService } from 'src/app/domain/services/absence/data-management-absence.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { Absence } from 'src/app/domain/models/absence/absence-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { AbsenceFilter, TruncatedAbsence } from 'src/app/domain/models/absence/absence-class';

describe('AbsenceComponent', () => {
  let component: AbsenceComponent;
  let fixture: ComponentFixture<AbsenceComponent>;
  let mockDataManagementAbsenceService: any;
  let mockNgbModal: any;
  let mockModalService: ModalService;
  let mockTranslateService: any;

  const createMockAbsence = (id: string, nameDe: string): Absence => {
    const absence = new Absence();
    absence.id = id as any;
    absence.name = new MultiLanguage();
    absence.name.de = nameDe;
    absence.description = new MultiLanguage();
    absence.description.de = `Description for ${nameDe}`;
    absence.color = '#FF0000';
    absence.defaultLength = 5;
    absence.defaultValue = 8;
    absence.withSaturday = false;
    absence.withSunday = false;
    absence.withHoliday = true;
    absence.hideInGantt = false;
    return absence;
  };

  const mockAbsences: Absence[] = [
    createMockAbsence('1', 'Urlaub'),
    createMockAbsence('2', 'Krankheit'),
  ];

  beforeEach(async () => {
    vi.spyOn(console, 'error');

    const dataManagementAbsenceServiceSpy = {
      listWrapper: { absences: mockAbsences } as TruncatedAbsence,
      currentFilter: new AbsenceFilter(),
      maxItems: 10,
      firstItem: 0,
      readPage: vi.fn(),
      addAbsence: vi.fn().mockResolvedValue(undefined),
      updateAbsence: vi.fn().mockResolvedValue(undefined),
      deleteAbsence: vi.fn(),
      setTemporaryFilter: vi.fn(),
      isTemoraryFilter_Dirty: vi.fn().mockReturnValue(false),
      isRead: signal(false),
    };

    const ngbModalSpy = {
      open: vi.fn(),
    };

    const onLangChangeSubject = new Subject<any>();
    const translateServiceSpy = {
      currentLang: 'de',
      instant: vi.fn().mockReturnValue('Translated text'),
      get: vi.fn().mockReturnValue(of('Translated text')),
      onLangChange: onLangChangeSubject.asObservable(),
      stream: vi.fn().mockReturnValue(of('Translated text')),
    };

    await TestBed.configureTestingModule({
      imports: [AbsenceComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementAbsenceService, useValue: dataManagementAbsenceServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        ModalService,
      ],
    }).compileComponents();

    mockDataManagementAbsenceService = TestBed.inject(DataManagementAbsenceService) as any;
    mockNgbModal = TestBed.inject(NgbModal) as any;
    mockModalService = TestBed.inject(ModalService);
    mockTranslateService = TestBed.inject(TranslateService) as any;

    fixture = TestBed.createComponent(AbsenceComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should call readPage on init', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(mockDataManagementAbsenceService.readPage).toHaveBeenCalled();
    });

    it('should set currentLang from translate service', () => {
      // Arrange
      const translateService = TestBed.inject(TranslateService);
      translateService.use('de');

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.currentLang).toBe('de');
    });
  });

  describe('Create Absence', () => {
    it('should initialize new absence with default values', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});

      // Act
      component.createNewAbsence({});

      // Assert
      expect(component.currentAbsence).toBeTruthy();
      expect(component.currentAbsence.id).toBeUndefined();
      expect(component.currentAbsence.name).toBeTruthy();
      expect(component.currentAbsence.name!.de).toBe('');
    });

    it('should initialize form when creating new absence', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});

      // Act
      component.createNewAbsence({});

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('');
      expect(formData.description).toBe('');
      expect(formData.color).toBe('#000000');
    });
  });

  describe('Edit Absence', () => {
    it('should set currentAbsence when editing', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});
      const absenceToEdit = mockAbsences[0];

      // Act
      component.onEditAbsence({}, absenceToEdit);

      // Assert
      expect(component.currentAbsence).toBe(absenceToEdit);
    });

    it('should initialize form with absence data', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});
      const absenceToEdit = mockAbsences[0];

      // Act
      component.onEditAbsence({}, absenceToEdit);

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('Urlaub');
      expect(formData.color).toBe('#FF0000');
      expect(formData.defaultLength).toBe(5);
      expect(formData.withHoliday).toBe(true);
    });
  });

  describe('Copy Absence', () => {
    it('should copy absence and clear id', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});
      const absenceToCopy = mockAbsences[0];

      // Act
      component.onCopyAbsence({}, absenceToCopy);

      // Assert
      expect(component.currentAbsence.id).toBeUndefined();
      expect(component.currentAbsence.name!.de).toBe(absenceToCopy.name!.de);
    });

    it('should initialize form with copied data', () => {
      // Arrange
      fixture.detectChanges();
      vi.spyOn(component, 'openNewAbsence').mockImplementation(() => {});
      const absenceToCopy = mockAbsences[0];

      // Act
      component.onCopyAbsence({}, absenceToCopy);

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('Urlaub');
      expect(formData.color).toBe('#FF0000');
    });
  });

  describe('Delete Absence', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open delete modal with correct context', () => {
      // Arrange
      const absenceToDelete = mockAbsences[0];

      // Act
      component.openDeleteAbsence(absenceToDelete);

      // Assert
      expect(mockModalService.componentContext).toBe('absence');
      expect(mockModalService.Filing).toBe(absenceToDelete.id);
    });

    it('should not open delete modal if absence has no id', () => {
      // Arrange
      const absenceWithoutId = new Absence();

      // Act
      component.openDeleteAbsence(absenceWithoutId);

      // Assert
      expect(mockModalService.Filing).toBe('');
    });

    it('should delete absence when modal service confirms', async () => {
      // Arrange
      component.currentLang = 'de';
      const absenceToDelete = mockAbsences[0];

      // Act
      component.openDeleteAbsence(absenceToDelete);
      mockModalService.result(ModalType.Delete);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockDataManagementAbsenceService.deleteAbsence).toHaveBeenCalledWith(
        absenceToDelete.id,
        'de'
      );
    });
  });

  describe('Save Absence', () => {
    let mockModal: any;

    beforeEach(() => {
      mockModal = { close: vi.fn() };
      fixture.detectChanges();
    });

    it('should create new absence', async () => {
      // Arrange
      component.currentAbsence = new Absence();
      component.currentAbsence.name = new MultiLanguage();
      component.currentAbsence.description = new MultiLanguage();
      (component as any).formModel.set({
        name: 'New Absence',
        description: 'New Description',
        defaultLength: 3,
        defaultValue: 4,
        withSaturday: true,
        withSunday: false,
        withHoliday: false,
        color: '#00FF00',
        hideInGantt: false,
        isUnpaid: false,
      });

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockDataManagementAbsenceService.addAbsence).toHaveBeenCalled();
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should update existing absence', async () => {
      // Arrange
      const existingAbsence = mockAbsences[0];
      component.currentAbsence = existingAbsence;
      (component as any).formModel.set({
        name: 'Updated Name',
        description: 'Updated Description',
        defaultLength: 10,
        defaultValue: 12,
        withSaturday: true,
        withSunday: true,
        withHoliday: false,
        color: '#0000FF',
        hideInGantt: true,
        isUnpaid: false,
      });

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockDataManagementAbsenceService.updateAbsence).toHaveBeenCalled();
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should apply form data to absence before saving', async () => {
      // Arrange
      component.currentLang = 'de';
      component.currentAbsence = new Absence();
      component.currentAbsence.name = new MultiLanguage();
      component.currentAbsence.description = new MultiLanguage();
      (component as any).formModel.set({
        name: 'Test Name',
        description: 'Test Description',
        defaultLength: 7,
        defaultValue: 8,
        withSaturday: true,
        withSunday: false,
        withHoliday: true,
        color: '#ABCDEF',
        hideInGantt: true,
        isUnpaid: false,
      });

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(component.currentAbsence.name!.de).toBe('Test Name');
      expect(component.currentAbsence.description!.de).toBe('Test Description');
      expect(component.currentAbsence.defaultLength).toBe(7);
      expect(component.currentAbsence.defaultValue).toBe(8);
      expect(component.currentAbsence.withSaturday).toBe(true);
      expect(component.currentAbsence.withHoliday).toBe(true);
      expect(component.currentAbsence.color).toBe('#ABCDEF');
      expect(component.currentAbsence.hideInGantt).toBe(true);
    });
  });

  describe('Form Initialization', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should initialize form with absence multi-language name', () => {
      // Arrange
      const absence = createMockAbsence('1', 'Test Name');
      absence.name!.en = 'English Name';
      component.currentLang = 'en' as any;
      component.currentAbsence = absence;

      // Act
      (component as any).initFormFromAbsence();

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('English Name');
    });

    it('should fallback to German if current language not available', () => {
      // Arrange
      const absence = createMockAbsence('1', 'German Name');
      component.currentLang = 'fr' as any;
      component.currentAbsence = absence;

      // Act
      (component as any).initFormFromAbsence();

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('German Name');
    });

    it('should handle empty absence', () => {
      // Arrange
      component.currentAbsence = new Absence();

      // Act
      (component as any).initFormFromAbsence();

      // Assert
      const formData = (component as any).formModel();
      expect(formData.name).toBe('');
      expect(formData.description).toBe('');
      expect(formData.color).toBe('#000000');
    });
  });

  describe('Row Click', () => {
    it('should set highlightRowId on row click', () => {
      // Arrange
      const absence = mockAbsences[0];

      // Act
      component.onClickedRow(absence);

      // Assert
      expect(component.highlightRowId).toBe(absence.id);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle next page', () => {
      // Arrange
      vi.useFakeTimers();
      component.page = 1;

      // Act
      component.onPageChange(2);
      vi.advanceTimersByTime(250);

      // Assert
      expect(component.isNextPage).toBe(true);
      expect(mockDataManagementAbsenceService.readPage).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle previous page', () => {
      // Arrange
      vi.useFakeTimers();
      component.page = 2;

      // Act
      component.onPageChange(1);
      vi.advanceTimersByTime(250);

      // Assert
      expect(component.isPreviousPage).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call readPage when header clicked', () => {
      // Arrange
      mockDataManagementAbsenceService.readPage.mockClear();

      // Act
      component.onClickHeader('name');

      // Assert
      expect(mockDataManagementAbsenceService.readPage).toHaveBeenCalled();
    });
  });
});
