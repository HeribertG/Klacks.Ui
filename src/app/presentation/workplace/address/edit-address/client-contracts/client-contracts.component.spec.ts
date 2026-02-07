/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientContractsComponent } from './client-contracts.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { IClientContract } from 'src/app/domain/models/client/client-class';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

describe('ClientContractsComponent', () => {
    let component: ClientContractsComponent;
    let fixture: ComponentFixture<ClientContractsComponent>;
    let mockDataManagementClientService: any;
    let mockContractService: any;
    let mockAuthorizationService: any;
    let editClientSignal: WritableSignal<any>;
    let editClientDeletedSignal: WritableSignal<boolean>;

    beforeEach(async () => {
        const mockContract: IClientContract = {
            id: '1',
            clientId: '123',
            contractId: '550e8400-e29b-41d4-a716-446655440000',
            contract: undefined,
            fromDate: new Date('2025-01-01'),
            untilDate: undefined,
            isActive: true,
        };

        editClientSignal = signal({
            id: '123',
            clientContracts: [mockContract],
        });

        editClientDeletedSignal = signal(false);

        mockDataManagementClientService = {
            editClient: editClientSignal,
            editClientDeleted: editClientDeletedSignal,
            addContract: vi.fn(),
            clientEditService: {
                editClient: editClientSignal,
            },
        };

        mockContractService = {
            readContracts: vi.fn().mockReturnValue(Promise.resolve([
                { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Vollzeit 160 BE' },
                { id: '660e8400-e29b-41d4-a716-446655440001', name: 'Teilzeit 80 BE' },
            ])),
        };

        mockAuthorizationService = {
            isAdmin: true,
        };

        await TestBed.configureTestingModule({
            imports: [
                ClientContractsComponent,
                TranslateModule.forRoot(),
                FormsModule,
                NgbModule,
            ],
            providers: [
                {
                    provide: DataManagementClientService,
                    useValue: mockDataManagementClientService,
                },
                {
                    provide: DataManagementContractService,
                    useValue: mockContractService,
                },
                { provide: AuthorizationService, useValue: mockAuthorizationService },
                TableSortingService,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ClientContractsComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should load contracts', async () => {
            await component.ngOnInit();
            expect(mockContractService.readContracts).toHaveBeenCalled();
            expect(component.contracts.length).toBe(2);
        });
    });

    describe('isDisabled', () => {
        it('should return true when client is deleted', () => {
            editClientDeletedSignal.set(true);
            expect(component.isDisabled()).toBe(true);
        });

        it('should return true when not authorized', () => {
            mockAuthorizationService.isAdmin = false;
            expect(component.isDisabled()).toBe(true);
        });

        it('should return false when authorized and client not deleted', () => {
            editClientDeletedSignal.set(false);
            mockAuthorizationService.isAdmin = true;
            expect(component.isDisabled()).toBe(false);
        });
    });

    describe('addContract', () => {
        it('should call addContract on service', () => {
            component.addContract();
            expect(mockDataManagementClientService.addContract).toHaveBeenCalled();
        });
    });

    describe('removeContract', () => {
        it('should remove contract at given index', () => {
            const client = editClientSignal();
            expect(client.clientContracts.length).toBe(1);

            component.removeContract(client.clientContracts[0]);

            const updatedClient = editClientSignal();
            expect(updatedClient.clientContracts.length).toBe(0);
        });
    });

    describe('trackByIndex', () => {
        it('should return the index', () => {
            expect(component.trackByIndex(0)).toBe(0);
            expect(component.trackByIndex(5)).toBe(5);
        });
    });

    describe('onActiveChange', () => {
        it('should deactivate other contracts when one is activated', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        clientId: '123',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        contract: undefined,
                        isActive: true,
                        fromDate: new Date(),
                        untilDate: undefined,
                    },
                    {
                        id: '2',
                        clientId: '123',
                        contractId: '660e8400-e29b-41d4-a716-446655440001',
                        contract: undefined,
                        isActive: false,
                        fromDate: new Date(),
                        untilDate: undefined,
                    },
                ],
            });

            const client = editClientSignal();
            component.onActiveChange(client.clientContracts[1]);

            client.clientContracts[1].isActive = true;

            component.onActiveChange(client.clientContracts[1]);

            expect(client.clientContracts[0].isActive).toBe(false);
            expect(client.clientContracts[1].isActive).toBe(true);
        });

        it('should update client signal and emit change event', () => {
            const client = editClientSignal();
            const spy = vi.spyOn(component.isChangingEvent, 'emit');
            component.onActiveChange(client.clientContracts[0]);
            expect(spy).toHaveBeenCalledWith(true);
        });
    });

    describe('sortContracts', () => {
        beforeEach(() => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        fromDate: new Date('2025-01-01'),
                        isActive: true,
                    },
                    {
                        id: '2',
                        contractId: '660e8400-e29b-41d4-a716-446655440001',
                        fromDate: new Date('2024-01-01'),
                        isActive: false,
                    },
                ],
            });
        });

        it('should sort by contract name ascending', () => {
            component.contracts = [
                { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Vollzeit 160 BE' } as any,
                { id: '660e8400-e29b-41d4-a716-446655440001', name: 'Teilzeit 80 BE' } as any,
            ];

            component.onClickHeader('contract');

            expect(component.sortedContracts[0].contractId).toBe('550e8400-e29b-41d4-a716-446655440000');
            expect(component.sortedContracts[1].contractId).toBe('660e8400-e29b-41d4-a716-446655440001');
        });

        it('should sort by fromDate', () => {
            component.onClickHeader('fromDate');

            expect(component.sortedContracts[0].id).toBe('2');
            expect(component.sortedContracts[1].id).toBe('1');
        });

        it('should sort by active status', () => {
            component.onClickHeader('active');

            expect(component.sortedContracts[0].isActive).toBe(false);
            expect(component.sortedContracts[1].isActive).toBe(true);
        });
    });

    describe('onClickHeader', () => {
        it('should cycle through three-way sort: asc -> desc -> none', () => {
            component.onClickHeader('fromDate');
            expect(component.sortingService.getCurrentSortOrder()).toBe('asc');
            expect(component.sortingService.getArrow('fromDate')).toBe('↓');

            component.onClickHeader('fromDate');
            expect(component.sortingService.getCurrentSortOrder()).toBe('desc');
            expect(component.sortingService.getArrow('fromDate')).toBe('↑');

            component.onClickHeader('fromDate');
            expect(component.sortingService.getCurrentSortOrder()).toBe('');
            expect(component.sortingService.getArrow('fromDate')).toBe('');
        });

        it('should call sortContracts on header click', () => {
            vi.spyOn(component, 'sortContracts');
            component.onClickHeader('contract');
            expect(component.sortContracts).toHaveBeenCalled();
        });
    });

    describe('calcValidation', () => {
        it('should set hasValidContracts to false when no contracts with contractId', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '',
                        isActive: false,
                        fromDate: new Date(),
                    },
                ],
            });

            component.calcValidation();

            expect(component.hasValidContracts).toBe(false);
            expect(component.hasAtLeastOneActive).toBe(false);
        });

        it('should set hasValidContracts to true when contracts with contractId exist', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        isActive: true,
                        fromDate: new Date(),
                    },
                ],
            });

            component.calcValidation();

            expect(component.hasValidContracts).toBe(true);
            expect(component.hasAtLeastOneActive).toBe(true);
        });

        it('should validate date ranges', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        isActive: true,
                        fromDate: new Date('2025-01-01'),
                        untilDate: new Date('2024-01-01'),
                    },
                ],
            });

            component.calcValidation();

            expect(component.isContractDateValid(0)).toBe(false);
        });

        it('should validate fromDate is required', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        isActive: true,
                        fromDate: undefined,
                    },
                ],
            });

            component.calcValidation();

            expect(component.isContractFromDateValid(0)).toBe(false);
        });

        it('should set validation to undefined when no untilDate', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '550e8400-e29b-41d4-a716-446655440000',
                        isActive: true,
                        fromDate: new Date('2025-01-01'),
                        untilDate: undefined,
                    },
                ],
            });

            component.calcValidation();

            expect(component.isContractDateValid(0)).toBeUndefined();
        });
    });

    describe('isContractDateValid', () => {
        it('should return validation state for given index', () => {
            component.contractValidationState.set(0, true);
            expect(component.isContractDateValid(0)).toBe(true);

            component.contractValidationState.set(1, false);
            expect(component.isContractDateValid(1)).toBe(false);

            component.contractValidationState.set(2, undefined);
            expect(component.isContractDateValid(2)).toBeUndefined();
        });
    });

    describe('isContractFromDateValid', () => {
        it('should return fromDate validation state for given index', () => {
            component.contractFromDateValidationState.set(0, true);
            expect(component.isContractFromDateValid(0)).toBe(true);

            component.contractFromDateValidationState.set(1, false);
            expect(component.isContractFromDateValid(1)).toBe(false);
        });
    });

    describe('getContractName', () => {
        beforeEach(() => {
            component.contracts = [
                { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Vollzeit 160 BE' } as any,
                { id: '660e8400-e29b-41d4-a716-446655440001', name: 'Teilzeit 80 BE' } as any,
            ];
        });

        it('should return contract name for valid contractId', () => {
            const name = (component as any).getContractName('550e8400-e29b-41d4-a716-446655440000');
            expect(name).toBe('Vollzeit 160 BE');
        });

        it('should return empty string for undefined contractId', () => {
            const name = (component as any).getContractName(undefined);
            expect(name).toBe('');
        });

        it('should return empty string for non-existent contractId', () => {
            const name = (component as any).getContractName('non-existent');
            expect(name).toBe('');
        });
    });

    describe('ngOnDestroy', () => {
        it('should unsubscribe from form changes', () => {
            const mockSubscription = {
                unsubscribe: vi.fn()
            };
            component.objectForUnsubscribe = mockSubscription;

            component.ngOnDestroy();

            expect(mockSubscription.unsubscribe).toHaveBeenCalled();
        });

        it('should handle undefined subscription', () => {
            component.objectForUnsubscribe = undefined;
            expect(() => component.ngOnDestroy()).not.toThrow();
        });
    });

    describe('hasAtLeastOneActive validation', () => {
        it('should ignore contracts without contractId', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '',
                        isActive: true,
                        fromDate: new Date(),
                    },
                ],
            });

            component.calcValidation();

            expect(component.hasValidContracts).toBe(false);
            expect(component.hasAtLeastOneActive).toBe(false);
        });

        it('should detect active contract among valid contracts', () => {
            editClientSignal.set({
                id: '123',
                clientContracts: [
                    {
                        id: '1',
                        contractId: '',
                        isActive: true,
                        fromDate: new Date(),
                    },
                    {
                        id: '2',
                        contractId: '660e8400-e29b-41d4-a716-446655440001',
                        isActive: true,
                        fromDate: new Date(),
                    },
                ],
            });

            component.calcValidation();

            expect(component.hasValidContracts).toBe(true);
            expect(component.hasAtLeastOneActive).toBe(true);
        });
    });
});
