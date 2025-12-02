import type { MockedObject } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError, Subject } from 'rxjs';

import { BranchesComponent } from './branches.component';
import { DataBranchService } from 'src/app/infrastructure/api/data-branch.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IBranch } from 'src/app/domain/models/branch';
import { ModalService, ModalType, } from 'src/app/presentation/modal/modal.service';

describe('BranchesComponent', () => {
    let component: BranchesComponent;
    let fixture: ComponentFixture<BranchesComponent>;
    let mockBranchService: any;
    let mockToastService: any;
    let mockNgbModal: any;
    let mockModalService: ModalService;
    let mockTranslateService: any;

    const mockBranches: IBranch[] = [
        {
            id: '1',
            name: 'Branch 1',
            address: 'Address 1',
            phone: '123-456-7890',
            email: 'branch1@test.com',
            select: false,
            isDirty: 0,
        },
        {
            id: '2',
            name: 'Branch 2',
            address: 'Address 2',
            phone: '098-765-4321',
            email: 'branch2@test.com',
            select: false,
            isDirty: 0,
        },
    ];

    beforeEach(async () => {
        vi.spyOn(console, 'error');

        const branchServiceSpy = {
            getBranchList: vi.fn(),
            addBranch: vi.fn(),
            updateBranch: vi.fn(),
            deleteBranch: vi.fn()
        };

        const toastServiceSpy = {
            showError: vi.fn(),
            showSuccess: vi.fn()
        };

        const ngbModalSpy = {
            open: vi.fn()
        };

        const translateServiceSpy = {
            instant: vi.fn(),
            get: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');
        translateServiceSpy.get.mockReturnValue(of('Translated text'));

        branchServiceSpy.getBranchList.mockReturnValue(of(mockBranches));

        await TestBed.configureTestingModule({
            imports: [BranchesComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataBranchService, useValue: branchServiceSpy },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: NgbModal, useValue: ngbModalSpy },
                ModalService,
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockBranchService = TestBed.inject(DataBranchService) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;
        mockNgbModal = TestBed.inject(NgbModal) as any;
        mockModalService = TestBed.inject(ModalService);
        mockTranslateService = TestBed.inject(TranslateService) as any;

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
            mockBranchService.getBranchList.mockReturnValue(throwError(() => new Error('Load error')));

            // Act
            fixture.detectChanges();

            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith('setting.branches.error.load-branches');
            expect(component.branches.length).toBe(0);
            expect(component.isLoading).toBe(false);
        });
    });

    describe('Add Branch', () => {
        it('should initialize new branch with default values', async () => {
            // Act
            component.onClickAdd();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(component.isNewBranch).toBe(true);
            expect(component.editingBranch).toBeTruthy();
            expect(component.editingBranch?.name).toBe('');
            expect(component.editingBranch?.address).toBe('');
            expect(component.editingBranch?.phone).toBe('');
            expect(component.editingBranch?.email).toBe('');
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
            fixture.detectChanges();
        });

        it('should open delete modal with correct context', () => {
            // Arrange
            const branchToDelete = mockBranches[0];

            // Act
            component.openDeleteBranch(branchToDelete);

            // Assert
            expect(mockModalService.componentContext).toBe('branches');
            expect(mockModalService.Filing).toBe(branchToDelete.id as string);
        });

        it('should not open delete modal if branch has no id', () => {
            // Arrange
            const branchWithoutId: IBranch = {
                id: undefined,
                name: 'Test',
                address: 'Test',
                phone: '',
                email: '',
                select: false,
                isDirty: 0,
            };

            // Act
            component.openDeleteBranch(branchWithoutId);

            // Assert
            expect(mockModalService.Filing).toBe('');
        });

        it('should delete branch when modal service confirms', async () => {
            // Arrange
            const branchToDelete = mockBranches[0];
            mockBranchService.deleteBranch.mockReturnValue(of({} as any));

            // Act
            component.openDeleteBranch(branchToDelete);
            mockModalService.result(ModalType.Delete);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert
            expect(mockBranchService.deleteBranch).toHaveBeenCalledWith(branchToDelete.id as string);
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('setting.branches.success.delete', 'Success');
        });

        it('should handle delete error', async () => {
            // Arrange
            const branchToDelete = mockBranches[0];
            mockBranchService.deleteBranch.mockReturnValue(throwError(() => new Error('Delete failed')));

            // Act
            component.openDeleteBranch(branchToDelete);
            mockModalService.result(ModalType.Delete);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith('setting.branches.error.delete');
        });
    });

    describe('Save Branch', () => {
        let mockModal: any;

        beforeEach(() => {
            mockModal = { close: vi.fn() };
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
                isDirty: 0,
            };
            const createdBranch = { ...component.editingBranch, id: '3' };
            mockBranchService.addBranch.mockReturnValue(of(createdBranch));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockBranchService.addBranch).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('setting.branches.success.create', 'Success');
            expect(mockModal.close).toHaveBeenCalled();
        });

        it('should update existing branch', async () => {
            // Arrange
            component.isNewBranch = false;
            component.onClickEdit(mockBranches[0]);
            component.editingBranch!.address = 'Updated Address';
            mockBranchService.updateBranch.mockReturnValue(of(component.editingBranch!));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockBranchService.updateBranch).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('setting.branches.success.update', 'Success');
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
                isDirty: 0,
            };
            mockBranchService.addBranch.mockReturnValue(throwError(() => new Error('Save failed')));

            // Act
            await component.onSaveModal(mockModal);

            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith('setting.branches.error.save');
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
                isDirty: 0,
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
                isDirty: 0,
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
            expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.branches.validation.name-required');
            expect(mockTranslateService.instant).toHaveBeenCalledWith('setting.branches.validation.address-required');
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
