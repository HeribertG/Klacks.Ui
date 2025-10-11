/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientContractsComponent } from './client-contracts.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataManagementContractService } from 'src/app/domain/services/data-management-contract.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { IClientContract } from 'src/app/domain/models/client-class';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

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
      contractId: 'contract-1',
      contract: undefined,
      fromDate: new Date('2025-01-01'),
      untilDate: undefined,
      isActive: true,
      internalFromDate: { year: 2025, month: 1, day: 1 },
      internalUntilDate: undefined,
    };

    editClientSignal = signal({
      id: '123',
      clientContracts: [mockContract],
    });

    editClientDeletedSignal = signal(false);

    mockDataManagementClientService = {
      editClient: editClientSignal,
      editClientDeleted: editClientDeletedSignal,
      addContract: jasmine.createSpy('addContract'),
    };

    mockContractService = {
      readContracts: jasmine
        .createSpy('readContracts')
        .and.returnValue(
          Promise.resolve([
            { id: 'contract-1', name: 'Vollzeit 160 BE' },
            { id: 'contract-2', name: 'Teilzeit 80 BE' },
          ])
        ),
    };

    mockAuthorizationService = {
      isAuthorised: true,
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
      mockAuthorizationService.isAuthorised = false;
      expect(component.isDisabled()).toBe(true);
    });

    it('should return false when authorized and client not deleted', () => {
      editClientDeletedSignal.set(false);
      mockAuthorizationService.isAuthorised = true;
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

      component.removeContract(0);

      expect(client.clientContracts.length).toBe(0);
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
            contractId: 'contract-1',
            contract: undefined,
            isActive: true,
            fromDate: new Date(),
            untilDate: undefined,
            internalFromDate: { year: 2025, month: 1, day: 1 },
            internalUntilDate: undefined,
          },
          {
            id: '2',
            clientId: '123',
            contractId: 'contract-2',
            contract: undefined,
            isActive: false,
            fromDate: new Date(),
            untilDate: undefined,
            internalFromDate: { year: 2025, month: 1, day: 1 },
            internalUntilDate: undefined,
          },
        ],
      });

      component.onActiveChange(1);

      const client = editClientSignal();
      client.clientContracts[1].isActive = true;

      component.onActiveChange(1);

      expect(client.clientContracts[0].isActive).toBe(false);
      expect(client.clientContracts[1].isActive).toBe(true);
    });

    it('should call calcValidation', () => {
      spyOn(component, 'calcValidation');
      component.onActiveChange(0);
      expect(component.calcValidation).toHaveBeenCalled();
    });
  });

  describe('sortContracts', () => {
    beforeEach(() => {
      editClientSignal.set({
        id: '123',
        clientContracts: [
          {
            id: '1',
            contractId: 'contract-1',
            fromDate: new Date('2025-01-01'),
            isActive: true,
          },
          {
            id: '2',
            contractId: 'contract-2',
            fromDate: new Date('2024-01-01'),
            isActive: false,
          },
        ],
      });
    });

    it('should sort by contract name ascending', () => {
      component.contracts = [
        { id: 'contract-1', name: 'Vollzeit 160 BE' } as any,
        { id: 'contract-2', name: 'Teilzeit 80 BE' } as any,
      ];
      component.orderBy = 'contract';
      component.sortOrder = 'asc';

      component.sortContracts();

      const contracts = editClientSignal().clientContracts;
      expect(contracts[0].contractId).toBe('contract-2');
      expect(contracts[1].contractId).toBe('contract-1');
    });

    it('should sort by fromDate', () => {
      component.orderBy = 'fromDate';
      component.sortOrder = 'asc';

      component.sortContracts();

      const contracts = editClientSignal().clientContracts;
      expect(contracts[0].id).toBe('2');
      expect(contracts[1].id).toBe('1');
    });

    it('should sort by active status', () => {
      component.orderBy = 'active';
      component.sortOrder = 'asc';

      component.sortContracts();

      const contracts = editClientSignal().clientContracts;
      expect(contracts[0].isActive).toBe(false);
      expect(contracts[1].isActive).toBe(true);
    });
  });

  describe('onClickHeader', () => {
    it('should toggle sort direction', () => {
      component.onClickHeader('contract');
      expect(component.contractHeader.order).toBe(1);

      component.onClickHeader('contract');
      expect(component.contractHeader.order).toBe(2);

      component.onClickHeader('contract');
      expect(component.contractHeader.order).toBe(0);
    });

    it('should update arrow templates', () => {
      component.onClickHeader('contract');
      expect(component.arrowContract).toBe('↓');

      component.onClickHeader('contract');
      expect(component.arrowContract).toBe('↑');

      component.onClickHeader('contract');
      expect(component.arrowContract).toBe('');
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
            internalFromDate: { year: 2025, month: 1, day: 1 },
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
            contractId: 'contract-1',
            isActive: true,
            fromDate: new Date(),
            internalFromDate: { year: 2025, month: 1, day: 1 },
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
            contractId: 'contract-1',
            isActive: true,
            fromDate: new Date('2025-01-01'),
            untilDate: new Date('2024-01-01'),
            internalFromDate: { year: 2025, month: 1, day: 1 },
            internalUntilDate: { year: 2024, month: 1, day: 1 },
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
            contractId: 'contract-1',
            isActive: true,
            fromDate: undefined,
            internalFromDate: undefined,
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
            contractId: 'contract-1',
            isActive: true,
            fromDate: new Date('2025-01-01'),
            internalFromDate: { year: 2025, month: 1, day: 1 },
            internalUntilDate: undefined,
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
        { id: 'contract-1', name: 'Vollzeit 160 BE' } as any,
        { id: 'contract-2', name: 'Teilzeit 80 BE' } as any,
      ];
    });

    it('should return contract name for valid contractId', () => {
      const name = (component as any).getContractName('contract-1');
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
      const mockSubscription = jasmine.createSpyObj('Subscription', [
        'unsubscribe',
      ]);
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
            internalFromDate: { year: 2025, month: 1, day: 1 },
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
            internalFromDate: { year: 2025, month: 1, day: 1 },
          },
          {
            id: '2',
            contractId: 'contract-2',
            isActive: true,
            fromDate: new Date(),
            internalFromDate: { year: 2025, month: 1, day: 1 },
          },
        ],
      });

      component.calcValidation();

      expect(component.hasValidContracts).toBe(true);
      expect(component.hasAtLeastOneActive).toBe(true);
    });
  });
});
