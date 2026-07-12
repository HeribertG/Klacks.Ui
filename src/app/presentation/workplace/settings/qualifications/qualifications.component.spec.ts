// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { QualificationsComponent } from './qualifications.component';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';

describe('QualificationsComponent', () => {
  let component: QualificationsComponent;
  let fixture: ComponentFixture<QualificationsComponent>;
  let mockDataQualService: any;
  let mockDataCountryStateService: any;
  let mockToastService: any;
  let mockNgbModal: any;
  let mockModalService: ModalService;

  const mockQualifications: IQualification[] = [
    { id: '1', name: { de: 'Erste Hilfe', en: 'First Aid' }, isTimeLimited: false, type: QualificationType.Work, countries: [], category: QualificationCategory.None },
    { id: '2', name: { de: 'Gabelstapler', en: 'Forklift' }, isTimeLimited: true, type: QualificationType.Work, countries: [], category: QualificationCategory.None },
  ];

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockDataQualService = {
      getQualificationList: vi.fn().mockReturnValue(of(mockQualifications)),
      addQualification: vi.fn(),
      updateQualification: vi.fn(),
      deleteQualification: vi.fn(),
    };

    mockDataCountryStateService = {
      getCountryList: vi.fn().mockReturnValue(of([])),
    };

    mockToastService = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    mockNgbModal = {
      open: vi.fn(),
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue(''),
      get: vi.fn().mockReturnValue(of('')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    await TestBed.configureTestingModule({
      imports: [QualificationsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataQualificationService, useValue: mockDataQualService },
        { provide: DataCountryStateService, useValue: mockDataCountryStateService },
        { provide: ToastShowService, useValue: mockToastService },
        { provide: NgbModal, useValue: mockNgbModal },
        ModalService,
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockModalService = TestBed.inject(ModalService);
    fixture = TestBed.createComponent(QualificationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load qualifications on init', () => {
      fixture.detectChanges();

      expect(mockDataQualService.getQualificationList).toHaveBeenCalled();
      expect(component.qualifications().length).toBe(2);
    });

    it('should handle load error', () => {
      mockDataQualService.getQualificationList.mockReturnValue(throwError(() => new Error('Load error')));

      fixture.detectChanges();

      expect(mockToastService.showError).toHaveBeenCalledWith('setting.qualifications.error.load');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Search', () => {
    it('should filter qualifications by search term', () => {
      fixture.detectChanges();

      component.searchTerm.set('first');

      expect(component.filteredQualifications().length).toBe(1);
      expect(component.filteredQualifications()[0].name?.en).toBe('First Aid');
    });

    it('should return all qualifications when search term is empty', () => {
      fixture.detectChanges();

      component.searchTerm.set('');

      expect(component.filteredQualifications().length).toBe(2);
    });
  });

  describe('Add Qualification', () => {
    it('should initialize new qualification', () => {
      vi.useFakeTimers();

      component.onClickAdd();
      vi.advanceTimersByTime(10);

      expect(component.isNewQualification).toBe(true);
      expect(component.editingQualification).toBeTruthy();
      vi.useRealTimers();
    });
  });

  describe('Delete Qualification', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open delete modal with correct context', () => {
      component.openDeleteQualification(mockQualifications[0]);

      expect(mockModalService.componentContext).toBe('qualifications');
      expect(mockModalService.Filing).toBe('1');
    });

    it('should not open delete modal if qualification has no id', () => {
      component.openDeleteQualification({ name: { de: 'Test' }, isTimeLimited: false, type: QualificationType.Work, countries: [], category: QualificationCategory.None });

      expect(mockModalService.componentContext).not.toBe('qualifications');
    });

    it('should delete qualification when modal confirms', async () => {
      mockDataQualService.deleteQualification.mockReturnValue(of(undefined));

      component.openDeleteQualification(mockQualifications[0]);
      mockModalService.result(ModalType.Delete);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockDataQualService.deleteQualification).toHaveBeenCalledWith('1');
    });
  });

  describe('Form Validation', () => {
    it('should be valid if name is provided', () => {
      (component as any).formModel.set({ name: 'Test', description: '' });

      expect(component.isFormValid()).toBe(true);
    });

    it('should be invalid if name is empty', () => {
      (component as any).formModel.set({ name: '', description: '' });

      expect(component.isFormValid()).toBe(false);
    });
  });
});
