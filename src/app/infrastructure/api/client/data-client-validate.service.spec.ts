// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the validateAddress API method in DataClientService.
 * Verifies HTTP method, URL, and request body of the address validation.
 * @param validateAddress - POST /Addresses/Validate with IAddress as body
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataClientService } from './data-client.service';
import { environment } from 'src/environments/environment';
import { IAddress, Address } from 'src/app/domain/models/client/client-class';
import { IAddressValidationResult } from 'src/app/domain/models/client/i-address-validation-result';

function createTestAddress(): IAddress {
  const address = new Address();
  address.street = 'Bahnhofstrasse 10';
  address.zip = '8001';
  address.city = 'Zuerich';
  address.country = 'Switzerland';
  return address;
}

describe('DataClientService - validateAddress', () => {
  let service: DataClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataClientService],
    });
    service = TestBed.inject(DataClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should POST to correct URL', () => {
    const address = createTestAddress();

    service.validateAddress(address).subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}Addresses/Validate`);
    expect(req.request.method).toBe('POST');
    req.flush({ isValid: true, matchType: 'exact', suggestions: [] });
  });

  it('should send address as body', () => {
    const address = createTestAddress();

    service.validateAddress(address).subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}Addresses/Validate`);
    expect(req.request.body).toEqual({
      street: address.street,
      zip: address.zip,
      city: address.city,
      state: address.state,
      country: address.country,
    });
    req.flush({ isValid: true, matchType: 'exact', suggestions: [] });
  });

  it('should return validation result', () => {
    const address = createTestAddress();
    const expectedResult: IAddressValidationResult = {
      isValid: true,
      matchType: 'exact',
      latitude: 47.3769,
      longitude: 8.5417,
      returnedAddress: 'Bahnhofstrasse 10, 8001 Zuerich',
      suggestions: [],
    };

    service.validateAddress(address).subscribe((result) => {
      expect(result).toEqual(expectedResult);
      expect(result.isValid).toBe(true);
      expect(result.latitude).toBe(47.3769);
      expect(result.longitude).toBe(8.5417);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}Addresses/Validate`);
    req.flush(expectedResult);
  });
});
