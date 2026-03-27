// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the address validation logic in ClientEditService.
 * Verifies validation before saving, error handling, and event emission.
 * @param validateAddress - Method that validates a single address via API
 * @param saveEditClient - Method that validates all addresses before saving
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientEditService } from './client-edit.service';
import {
  Client,
  Address,
} from 'src/app/domain/models/client/client-class';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import {
  EVENT_BUS_TOKEN,
  IEventBus,
} from 'src/app/domain/interfaces/event-bus.interface';
import { ClientConfigService } from './client-config.service';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { ClientContractService } from './client-contract.service';
import { ClientGroupItemService } from './client-group-item.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { IAddressValidationResult } from 'src/app/domain/models/client/i-address-validation-result';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

function createValidClient(): Client {
  const client = new Client();
  client.id = 'test-id';
  client.firstName = 'John';
  client.name = 'Doe';
  client.gender = GenderEnum.male;
  client.legalEntity = false;
  client.clientContracts = [];
  client.groupItems = [];

  const address = new Address();
  address.street = 'Hauptstrasse 1';
  address.zip = '12345';
  address.city = 'TestCity';
  address.country = 'Germany';
  client.addresses = [address];

  return client;
}

function createDirtyDummy(): Client {
  const dummy = new Client();
  dummy.id = 'test-id';
  dummy.firstName = 'OriginalFirstName';
  dummy.name = 'Doe';
  dummy.gender = GenderEnum.male;
  dummy.legalEntity = false;
  dummy.clientContracts = [];
  dummy.groupItems = [];

  const address = new Address();
  address.street = 'Hauptstrasse 1';
  address.zip = '12345';
  address.city = 'TestCity';
  address.country = 'Germany';
  dummy.addresses = [address];

  return dummy;
}

function createValidationResult(overrides: Partial<IAddressValidationResult> = {}): IAddressValidationResult {
  return {
    isValid: true,
    matchType: 'exact',
    latitude: 52.52,
    longitude: 13.405,
    returnedAddress: 'Hauptstrasse 1, 12345 TestCity',
    suggestions: [],
    ...overrides,
  };
}

describe('ClientEditService - Address Validation', () => {
  let service: ClientEditService;
  let mockEventBus: IEventBus;
  let mockDataClientService: Partial<DataClientService>;

  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(of()),
      onAny: vi.fn().mockReturnValue(of()),
    };

    mockDataClientService = {
      validateAddress: vi.fn().mockReturnValue(of(createValidationResult())),
      updateClient: vi.fn().mockReturnValue(of(createValidClient())),
      addClient: vi.fn().mockReturnValue(of(createValidClient())),
      getClient: vi.fn().mockReturnValue(of(createValidClient())),
      countIdNumber: vi.fn().mockReturnValue(of(0)),
      readClientAddressList: vi.fn().mockReturnValue(of([])),
    };

    const mockAddressService = {
      setAddress: vi.fn().mockImplementation((client, _index) => ({
        editClient: client,
        currentAddressIndex: 0,
      })),
    };

    const mockCommunicationService = {
      setCommunication: vi.fn(),
    };

    const mockClientConfigService = {
      hasRootGroups: signal(true),
      defaultTypePhone: signal(-1),
      defaultTypeEmail: signal(-1),
      isSwissPrefixId: signal(''),
      communicationTypePhoneList: signal([]),
      communicationTypeEmailList: signal([]),
      communicationPrefixList: signal([]),
      isInit: signal(false),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        ClientEditService,
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
        { provide: ClientConfigService, useValue: mockClientConfigService },
        { provide: AddressService, useValue: mockAddressService },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: ClientContractService, useValue: {} },
        { provide: ClientGroupItemService, useValue: {} },
        { provide: DataClientService, useValue: mockDataClientService },
      ],
    });

    service = TestBed.inject(ClientEditService);
  });

  describe('saveEditClient', () => {
    it('should validate addresses before saving', async () => {
      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockDataClientService.validateAddress).toHaveBeenCalledWith(client.addresses[0]);
    });

    it('should block save when address validation fails', async () => {
      const failedResult = createValidationResult({
        isValid: false,
        suggestions: [{ displayName: 'Alt Address', latitude: 52.0, longitude: 13.0 }],
      });
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(of(failedResult));

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockDataClientService.updateClient).not.toHaveBeenCalled();
      expect(mockDataClientService.addClient).not.toHaveBeenCalled();
    });

    it('should emit ADDRESS_VALIDATION_FAILED event on failure', async () => {
      const failedResult = createValidationResult({
        isValid: false,
        suggestions: [{ displayName: 'Alt Address', latitude: 52.0, longitude: 13.0 }],
      });
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(of(failedResult));

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ADDRESS_VALIDATION_FAILED,
        expect.objectContaining({
          street: 'Hauptstrasse 1',
          zip: '12345',
          city: 'TestCity',
          country: 'Germany',
          suggestions: [{ displayName: 'Alt Address', latitude: 52.0, longitude: 13.0 }],
        }),
      );
    });

    it('should proceed with save when validation succeeds', async () => {
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        of(createValidationResult()),
      );

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockDataClientService.updateClient).toHaveBeenCalled();
    });

    it('should set coordinates from validation result', async () => {
      const validResult = createValidationResult({
        isValid: true,
        latitude: 48.137,
        longitude: 11.576,
      });
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(of(validResult));

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      const savedClient = (mockDataClientService.updateClient as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedClient.addresses[0].latitude).toBe(48.137);
      expect(savedClient.addresses[0].longitude).toBe(11.576);
    });
  });

  describe('validateAddress', () => {
    it('should handle invalid validation result', async () => {
      const validationResult: IAddressValidationResult = {
        isValid: false,
        matchType: 'none',
        suggestions: [{ displayName: 'Suggested Address', latitude: 50.0, longitude: 10.0 }],
      };
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        of(validationResult),
      );

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockDataClientService.updateClient).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ADDRESS_VALIDATION_FAILED,
        expect.objectContaining({
          suggestions: [{ displayName: 'Suggested Address', latitude: 50.0, longitude: 10.0 }],
        }),
      );
    });

    it('should return true on network error (fail-open)', async () => {
      (mockDataClientService.validateAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      const client = createValidClient();
      service.editClient.set(client);
      service.editClientDummy = createDirtyDummy();

      await service.saveEditClient();

      expect(mockDataClientService.updateClient).toHaveBeenCalled();
    });
  });
});
