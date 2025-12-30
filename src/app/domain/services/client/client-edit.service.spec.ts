import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientEditService } from './client-edit.service';
import {
  Client,
  ClientContract,
  Address,
} from 'src/app/domain/models/client-class';
import { ClientGroupItem } from 'src/app/domain/models/client-group-item-class';
import { GenderEnum, EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import {
  EVENT_BUS_TOKEN,
  IEventBus,
} from 'src/app/domain/interfaces/event-bus.interface';
import { ClientConfigService } from './client-config.service';
import { of } from 'rxjs';

class MockEventBus implements IEventBus {
  emit<_T>(_eventType: string, _payload: _T): void {}
  on<_T>(_eventType: string) {
    return of();
  }
  onAny() {
    return of();
  }
}

class MockClientConfigService {
  hasRootGroups(): boolean {
    return true;
  }
}

describe('ClientEditService', () => {
  let service: ClientEditService;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockEventBus = new MockEventBus();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        ClientEditService,
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
        { provide: ClientConfigService, useClass: MockClientConfigService },
      ],
    });
    service = TestBed.inject(ClientEditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isDirty', () => {
    it('should return false when editClient and editClientDummy are the same', () => {
      const client = new Client();
      client.id = 'test-id';
      client.firstName = 'John';
      client.name = 'Doe';

      service.editClient.set(client);

      const dummy = new Client();
      dummy.id = client.id;
      dummy.firstName = client.firstName;
      dummy.name = client.name;
      service.editClientDummy = dummy;

      expect(service.isDirty()).toBe(false);
    });

    it('should return true when editClient has changed', () => {
      const client = new Client();
      client.id = 'test-id';
      client.firstName = 'John';
      client.name = 'Doe';

      service.editClient.set(client);

      const dummy = new Client();
      dummy.id = client.id;
      dummy.firstName = client.firstName;
      dummy.name = client.name;
      service.editClientDummy = dummy;

      service.editClient.update((c) => {
        if (c) c.firstName = 'Jane';
        return c;
      });

      expect(service.isDirty()).toBe(true);
    });

    it('should return false when editClient is undefined', () => {
      service.editClient.set(undefined);
      service.editClientDummy = undefined;

      expect(service.isDirty()).toBe(false);
    });
  });

  describe('isValidNormalClient', () => {
    it('should return true for valid normal client', () => {
      const client = new Client();
      client.firstName = 'John';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      client.legalEntity = false;

      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];

      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidNormalClient'](client);

      expect(result).toBe(true);
    });

    it('should return false when firstName is missing', () => {
      const client = new Client();
      client.firstName = '';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidNormalClient'](client);

      expect(result).toBe(false);
    });

    it('should return false when name is missing', () => {
      const client = new Client();
      client.firstName = 'John';
      client.name = '';
      client.gender = GenderEnum.male;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidNormalClient'](client);

      expect(result).toBe(false);
    });

    it('should return false when gender is invalid', () => {
      const client = new Client();
      client.firstName = 'John';
      client.name = 'Doe';
      client.gender = GenderEnum.legalEntity;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidNormalClient'](client);

      expect(result).toBe(false);
    });
  });

  describe('isValidLegalEntity', () => {
    it('should return true for valid legal entity', () => {
      const client = new Client();
      client.company = 'Test Company';
      client.gender = GenderEnum.legalEntity;
      client.type = EntityTypeEnum.customer;
      client.legalEntity = true;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidLegalEntity'](client);

      expect(result).toBe(true);
    });

    it('should return false when company is missing', () => {
      const client = new Client();
      client.company = '';
      client.gender = GenderEnum.legalEntity;
      client.type = EntityTypeEnum.customer;
      client.legalEntity = true;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidLegalEntity'](client);

      expect(result).toBe(false);
    });

    it('should return false when address is missing', () => {
      const client = new Client();
      client.company = 'Test Company';
      client.gender = GenderEnum.legalEntity;
      client.type = EntityTypeEnum.customer;
      client.legalEntity = true;
      client.addresses = [];
      client.clientContracts = [];
      client.groupItems = [];

      const result = service['isValidLegalEntity'](client);

      expect(result).toBe(false);
    });
  });

  describe('isValidContracts', () => {
    it('should return true when no contracts exist', () => {
      const client = new Client();
      client.clientContracts = [];

      const result = service['isValidContracts'](client);

      expect(result).toBe(true);
    });

    it('should return true when contracts have valid dates', () => {
      // Arrange
      const client = new Client();
      const contract = new ClientContract();
      contract.contractId = '550e8400-e29b-41d4-a716-446655440000';
      contract.fromDate = new Date(2025, 0, 1);
      contract.untilDate = new Date(2025, 11, 31);
      contract.isActive = true;
      client.clientContracts = [contract];

      // Act
      const result = service['isValidContracts'](client);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when untilDate is before fromDate', () => {
      // Arrange
      const client = new Client();
      const contract = new ClientContract();
      contract.contractId = '550e8400-e29b-41d4-a716-446655440001';
      contract.fromDate = new Date(2025, 11, 31);
      contract.untilDate = new Date(2025, 0, 1);
      contract.isActive = true;
      client.clientContracts = [contract];

      // Act
      const result = service['isValidContracts'](client);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when untilDate is undefined', () => {
      // Arrange
      const client = new Client();
      const contract = new ClientContract();
      contract.contractId = '550e8400-e29b-41d4-a716-446655440002';
      contract.fromDate = new Date(2025, 0, 1);
      contract.untilDate = undefined;
      contract.isActive = true;
      client.clientContracts = [contract];

      // Act
      const result = service['isValidContracts'](client);

      // Assert
      expect(result).toBe(true);
    });

    it('should ignore contracts without contractId (new/empty contracts)', () => {
      const client = new Client();
      const emptyContract = new ClientContract();
      emptyContract.isActive = true;
      client.clientContracts = [emptyContract];

      const result = service['isValidContracts'](client);

      expect(result).toBe(true);
    });

    it('should validate only contracts with contractId', () => {
      // Arrange
      const client = new Client();

      const emptyContract = new ClientContract();
      emptyContract.isActive = false;

      const validContract = new ClientContract();
      validContract.id = '550e8400-e29b-41d4-a716-446655440003';
      validContract.contractId = '550e8400-e29b-41d4-a716-446655440010';
      validContract.isActive = true;
      validContract.fromDate = new Date(2025, 0, 1);

      client.clientContracts = [emptyContract, validContract];

      // Act
      const result = service['isValidContracts'](client);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when only valid contract is not active', () => {
      // Arrange
      const client = new Client();

      const emptyContract = new ClientContract();
      emptyContract.isActive = true;

      const validContract = new ClientContract();
      validContract.id = '550e8400-e29b-41d4-a716-446655440004';
      validContract.contractId = '550e8400-e29b-41d4-a716-446655440011';
      validContract.isActive = false;
      validContract.fromDate = new Date(2025, 0, 1);

      client.clientContracts = [emptyContract, validContract];

      // Act
      const result = service['isValidContracts'](client);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isValidGroupItems', () => {
    it('should return true when no group items exist', () => {
      const client = new Client();
      client.groupItems = [];

      const result = service['isValidGroupItems'](client);

      expect(result).toBe(true);
    });

    it('should return true when group items have valid dates', () => {
      // Arrange
      const client = new Client();
      const groupItem = new ClientGroupItem();
      groupItem.validFrom = new Date(2025, 0, 1);
      groupItem.validUntil = new Date(2025, 11, 31);
      client.groupItems = [groupItem];

      // Act
      const result = service['isValidGroupItems'](client);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when validUntil is before validFrom', () => {
      // Arrange
      const client = new Client();
      const groupItem = new ClientGroupItem();
      groupItem.validFrom = new Date(2025, 11, 31);
      groupItem.validUntil = new Date(2025, 0, 1);
      client.groupItems = [groupItem];

      // Act
      const result = service['isValidGroupItems'](client);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when validUntil is undefined', () => {
      // Arrange
      const client = new Client();
      const groupItem = new ClientGroupItem();
      groupItem.validFrom = new Date(2025, 0, 1);
      groupItem.validUntil = undefined;
      client.groupItems = [groupItem];

      // Act
      const result = service['isValidGroupItems'](client);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canSave', () => {
    it('should return false when client is not dirty', () => {
      const client = new Client();
      client.id = 'test-id';
      client.firstName = 'John';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      service.editClient.set(client);

      const dummy = new Client();
      dummy.id = client.id;
      dummy.firstName = client.firstName;
      dummy.name = client.name;
      dummy.gender = client.gender;
      dummy.legalEntity = client.legalEntity;
      const dummyAddress = new Address();
      dummyAddress.zip = '12345';
      dummyAddress.city = 'TestCity';
      dummyAddress.country = 'TestCountry';
      dummy.addresses = [dummyAddress];
      dummy.clientContracts = [];
      dummy.groupItems = [];
      service.editClientDummy = dummy;

      expect(service.canSave()).toBe(false);
    });

    it('should return false when client is dirty but invalid', () => {
      const client = new Client();
      client.id = 'test-id';
      client.firstName = '';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      service.editClient.set(client);
      service.editClientDummy = new Client();

      expect(service.canSave()).toBe(false);
    });

    it('should return true when client is dirty and valid', () => {
      const client = new Client();
      client.id = 'test-id';
      client.firstName = 'John';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      client.legalEntity = false;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      service.editClient.set(client);

      const dummyClient = new Client();
      dummyClient.id = 'test-id';
      dummyClient.firstName = 'Jane';
      dummyClient.name = 'Doe';
      service.editClientDummy = dummyClient;

      expect(service.canSave()).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should call isValidLegalEntity when client is legal entity', () => {
      const client = new Client();
      client.legalEntity = true;
      client.company = 'Test Company';
      client.gender = GenderEnum.legalEntity;
      client.type = EntityTypeEnum.customer;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      service.editClient.set(client);

      const result = service.isValid();

      expect(result).toBe(true);
    });

    it('should call isValidNormalClient when client is not legal entity', () => {
      const client = new Client();
      client.legalEntity = false;
      client.firstName = 'John';
      client.name = 'Doe';
      client.gender = GenderEnum.male;
      const address = new Address();
      address.zip = '12345';
      address.city = 'TestCity';
      address.country = 'TestCountry';
      client.addresses = [address];
      client.clientContracts = [];
      client.groupItems = [];

      service.editClient.set(client);

      const result = service.isValid();

      expect(result).toBe(true);
    });

    it('should return false when client is undefined', () => {
      service.editClient.set(undefined);

      const result = service.isValid();

      expect(result).toBe(false);
    });
  });
});
