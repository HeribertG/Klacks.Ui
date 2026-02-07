/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { BranchManagementService } from './branch-management.service';
import { DataBranchService } from 'src/app/infrastructure/api/settings/data-branch.service';
import { of } from 'rxjs';
import { IBranch } from 'src/app/domain/models/settings/branch';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('BranchManagementService', () => {
    let service: BranchManagementService;
    let dataBranchService: any;

    const mockBranch: IBranch = {
        id: 'branch-1',
        name: 'Main Branch',
        address: '123 Main St',
        phone: '+1234567890',
        email: 'branch@test.com',
        select: false,
        isDirty: 0
    };

    const mockBranches: IBranch[] = [mockBranch];

    beforeEach(() => {
        vi.useFakeTimers();

        const dataBranchServiceSpy = {
            getBranchList: vi.fn().mockReturnValue(of(mockBranches)),
            addBranch: vi.fn().mockReturnValue(of(mockBranch)),
            updateBranch: vi.fn().mockReturnValue(of(mockBranch)),
            deleteBranch: vi.fn().mockReturnValue(of({}))
        };

        TestBed.configureTestingModule({
            providers: [
                BranchManagementService,
                { provide: DataBranchService, useValue: dataBranchServiceSpy }
            ]
        });

        service = TestBed.inject(BranchManagementService);
        dataBranchService = TestBed.inject(DataBranchService) as any;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Signal behavior', () => {
        it('should have branchesList signal initialized', () => {
            // Assert
            expect(service.branchesList).toBeDefined();
            expect(typeof service.branchesList).toBe('function');
        });

        it('should have isLoading signal initialized to false', () => {
            // Assert
            expect(service.isLoading()).toBe(false);
        });

        it('should initialize branchesList as empty array', () => {
            // Assert
            expect(service.branchesList()).toEqual([]);
        });
    });

    describe('loadBranches', () => {
        it('should call dataBranchService.getBranchList', () => {
            // Act
            service.loadBranches();

            // Assert
            expect(dataBranchService.getBranchList).toHaveBeenCalled();
        });

        it('should set isLoading to false after loading completes', () => {
            // Arrange
            dataBranchService.getBranchList.mockReturnValue(of(mockBranches));

            // Act
            service.loadBranches();

            // Assert
            expect(service.isLoading()).toBe(false);
        });

        it('should populate branchesList from loaded data', () => {
            // Arrange
            dataBranchService.getBranchList.mockReturnValue(of(mockBranches));

            // Act
            service.loadBranches();

            // Assert
            expect(service.branchesList()).toEqual(mockBranches);
        });
    });

    describe('isBranchesDirty', () => {
        it('should return false when branches are unchanged', () => {
            // Arrange
            service.loadBranches();

            // Assert
            expect(service.isBranchesDirty()).toBe(false);
        });

        it('should return true when branch is modified', () => {
            // Arrange
            service.loadBranches();

            // Act
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Updated Name', isDirty: CreateEntriesEnum.rewrite }))
            );

            // Assert
            expect(service.isBranchesDirty()).toBe(true);
        });

        it('should return false for incomplete new entries', () => {
            // Arrange
            service.loadBranches();

            // Act
            const incompleteBranch: IBranch = {
                id: undefined,
                name: '',
                address: '',
                phone: '',
                email: '',
                select: false,
                isDirty: CreateEntriesEnum.new
            };
            service.branchesList.update(branches => [...branches, incompleteBranch]);

            // Assert
            expect(service.isBranchesDirty()).toBe(false);
        });
    });

    describe('isDirty', () => {
        it('should delegate to isBranchesDirty', () => {
            // Arrange
            service.loadBranches();

            // Assert
            expect(service.isDirty()).toBe(service.isBranchesDirty());
        });
    });

    describe('autoSave Timer', () => {
        it('should trigger saveBranches after 1500ms when isDirty', () => {
            // Arrange
            service.loadBranches();
            const saveSpy = vi.spyOn(service, 'saveBranches');

            // Act
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Auto Save Test', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should not trigger saveBranches if not isDirty', () => {
            // Arrange
            service.loadBranches();
            const saveSpy = vi.spyOn(service, 'saveBranches');

            // Act
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it('should debounce multiple changes within 1500ms', () => {
            // Arrange
            service.loadBranches();
            const saveSpy = vi.spyOn(service, 'saveBranches');

            // Act
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Change 1', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(500);
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Change 2', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(500);
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Change 3', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on each change', () => {
            // Arrange
            service.loadBranches();
            const saveSpy = vi.spyOn(service, 'saveBranches');

            // Act
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Change 1', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(1400);
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Change 2', isDirty: CreateEntriesEnum.rewrite }))
            );
            TestBed.flushEffects();
            vi.advanceTimersByTime(1400);

            // Assert
            expect(saveSpy).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('saveBranches', () => {
        it('should call addBranch for new branches', () => {
            // Arrange
            service.loadBranches();
            const newBranch: IBranch = {
                id: 'new-id',
                name: 'New Branch',
                address: 'New Address',
                phone: '111',
                email: 'new@test.com',
                select: false,
                isDirty: CreateEntriesEnum.new
            };
            service.branchesList.update(branches => [...branches, newBranch]);

            // Act
            service.saveBranches();

            // Assert
            expect(dataBranchService.addBranch).toHaveBeenCalled();
        });

        it('should call updateBranch for modified branches', () => {
            // Arrange
            service.loadBranches();
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, name: 'Updated', isDirty: CreateEntriesEnum.rewrite }))
            );

            // Act
            service.saveBranches();

            // Assert
            expect(dataBranchService.updateBranch).toHaveBeenCalled();
        });

        it('should call deleteBranch for deleted branches', () => {
            // Arrange
            service.loadBranches();
            service.branchesList.update(branches =>
                branches.map(b => ({ ...b, isDirty: CreateEntriesEnum.delete }))
            );

            // Act
            service.saveBranches();

            // Assert
            expect(dataBranchService.deleteBranch).toHaveBeenCalledWith('branch-1');
        });

        it('should skip branches without isDirty flag', () => {
            // Arrange
            service.loadBranches();

            // Act
            service.saveBranches();

            // Assert
            expect(dataBranchService.addBranch).not.toHaveBeenCalled();
            expect(dataBranchService.updateBranch).not.toHaveBeenCalled();
            expect(dataBranchService.deleteBranch).not.toHaveBeenCalled();
        });

        it('should delete empty branches marked as rewrite', () => {
            // Arrange
            service.loadBranches();
            service.branchesList.update(branches =>
                branches.map(b => ({
                    ...b,
                    name: '',
                    address: '',
                    phone: '',
                    email: '',
                    isDirty: CreateEntriesEnum.rewrite
                }))
            );

            // Act
            service.saveBranches();

            // Assert
            expect(dataBranchService.deleteBranch).toHaveBeenCalledWith('branch-1');
        });
    });
});
