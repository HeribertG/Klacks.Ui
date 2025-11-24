/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { BranchesComponent } from './branches.component';
import { DataBranchService } from 'src/app/infrastructure/api/data-branch.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IBranch } from 'src/app/domain/models/branch';

describe('BranchesComponent', () => {
  let component: BranchesComponent;
  let fixture: ComponentFixture<BranchesComponent>;
  let mockBranchService: jasmine.SpyObj<DataBranchService>;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockModalService: jasmine.SpyObj<NgbModal>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockBranches: IBranch[] = [
    {
      id: '1',
      name: 'Branch 1',
      address: 'Address 1',
      phone: '123-456-7890',
      email: 'branch1@test.com',
      select: false,
      isDirty: 0
    },
    {
      id: '2',
      name: 'Branch 2',
      address: 'Address 2',
      phone: '098-765-4321',
      email: 'branch2@test.com',
      select: false,
      isDirty: 0
    },
  ];

  beforeEach(async () => {
    spyOn(console, 'error');

    const branchServiceSpy = jasmine.createSpyObj('DataBranchService', [
      'getBranchList',
      'addBranch',
      'updateBranch',
      'deleteBranch',
    ]);

    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showError',
      'showSuccess',
    ]);

    const modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
      'get'
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');
    translateServiceSpy.get.and.returnValue(of('Translated text'));

    branchServiceSpy.getBranchList.and.returnValue(of(mockBranches));

    await TestBed.configureTestingModule({
      imports: [BranchesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataBranchService, useValue: branchServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: NgbModal, useValue: modalServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockBranchService = TestBed.inject(
      DataBranchService
    ) as jasmine.SpyObj<DataBranchService>;
    mockToastService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockModalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(BranchesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    // Arrange
    it('should load branches on init', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(mockBranchService.getBranchList).toHaveBeenCalled();
      expect(component.branches.length).toBe(2);
      expect(component.branches).toEqual(mockBranches);
    });

    it('should handle branch loading error', () => {
      // Arrange
      mockBranchService.getBranchList.and.returnValue(
        throwError(() => new Error('Load error'))
      );

      // Act
      fixture.detectChanges();

      // Assert
      expect(mockToastService.showError).toHaveBeenCalledWith(
        'setting.branches.error.load-branches'
      );
      expect(component.branches.length).toBe(0);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Add Branch', () => {
    it('should initialize new branch with default values', (done) => {
      // Act
      component.onClickAdd();

      // Assert
      setTimeout(() => {
        expect(component.isNewBranch).toBe(true);
        expect(component.editingBranch).toBeTruthy();
        expect(component.editingBranch?.name).toBe('');
        expect(component.editingBranch?.address).toBe('');
        expect(component.editingBranch?.phone).toBe('');
        expect(component.editingBranch?.email).toBe('');
        done();
      }, 10);
    });
  });

  describe('Edit Branch', () => {
    it('should set editing branch', () => {
      // Arrange
      const branchToEdit = mockBranches[0];

      // Act
      component.onClickEdit(branchToEdit);

      // Assert
      expect(component.isNewBranch).toBe(false);
      expect(component.editingBranch).toEqual(branchToEdit);
    });
  });

  describe('Delete Branch', () => {
    beforeEach(() => {
      component.branches = [...mockBranches];
    });

    it('should not delete if index is invalid', async () => {
      // Act
      await component.onClickDelete(-1);

      // Assert
      expect(mockModalService.open).not.toHaveBeenCalled();
    });
  });

  describe('Save Branch', () => {
    let mockModal: any;

    beforeEach(() => {
      mockModal = { close: jasmine.createSpy('close') };
    });

    it('should create new branch', async () => {
      // Arrange
      component.isNewBranch = true;
      component.editingBranch = {
        id: undefined,
        name: 'New Branch',
        address: 'New Address',
        phone: '111-222-3333',
        email: 'new@test.com',
        select: false,
        isDirty: 0
      };
      const createdBranch = { ...component.editingBranch, id: '3' };
      mockBranchService.addBranch.and.returnValue(of(createdBranch));

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockBranchService.addBranch).toHaveBeenCalled();
      expect(mockToastService.showSuccess).toHaveBeenCalledWith(
        'setting.branches.success.create',
        'Success'
      );
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should update existing branch', async () => {
      // Arrange
      component.isNewBranch = false;
      component.onClickEdit(mockBranches[0]);
      component.editingBranch!.address = 'Updated Address';
      mockBranchService.updateBranch.and.returnValue(of(component.editingBranch!));

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockBranchService.updateBranch).toHaveBeenCalled();
      expect(mockToastService.showSuccess).toHaveBeenCalledWith(
        'setting.branches.success.update',
        'Success'
      );
      expect(mockModal.close).toHaveBeenCalled();
    });

    it('should handle save error', async () => {
      // Arrange
      component.isNewBranch = true;
      component.editingBranch = {
        id: undefined,
        name: 'Test',
        address: 'Test Address',
        phone: '',
        email: '',
        select: false,
        isDirty: 0
      };
      mockBranchService.addBranch.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockToastService.showError).toHaveBeenCalledWith(
        'setting.branches.error.save'
      );
      expect(mockModal.close).not.toHaveBeenCalled();
    });

    it('should not save if form is invalid', async () => {
      // Arrange
      component.editingBranch = {
        id: undefined,
        name: '',
        address: '',
        phone: '',
        email: '',
        select: false,
        isDirty: 0
      };

      // Act
      await component.onSaveModal(mockModal);

      // Assert
      expect(mockBranchService.addBranch).not.toHaveBeenCalled();
      expect(mockBranchService.updateBranch).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      component.editingBranch = {
        id: undefined,
        name: 'Test Branch',
        address: 'Test Address',
        phone: '123-456-7890',
        email: 'test@example.com',
        select: false,
        isDirty: 0
      };
    });

    it('should validate complete branch', () => {
      // Act & Assert
      expect(component.isFormValid()).toBe(true);
    });

    it('should fail validation if name is missing', () => {
      // Arrange
      component.editingBranch!.name = '';

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should fail validation if address is missing', () => {
      // Arrange
      component.editingBranch!.address = '';

      // Act & Assert
      expect(component.isFormValid()).toBe(false);
    });

    it('should return validation error messages', () => {
      // Arrange
      component.editingBranch!.name = '';
      component.editingBranch!.address = '';

      // Act
      const errors = component.getValidationErrors();

      // Assert
      expect(errors.length).toBe(2);
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.branches.validation.name-required'
      );
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.branches.validation.address-required'
      );
    });

    it('should allow optional phone and email fields', () => {
      // Arrange
      component.editingBranch!.phone = '';
      component.editingBranch!.email = '';

      // Act & Assert
      expect(component.isFormValid()).toBe(true);
    });
  });
});
