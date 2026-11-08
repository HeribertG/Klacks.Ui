// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { StandInService } from './stand-in.service';
import { ClientConfigService } from './client-config.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { AddressTypeEnum, EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { IStandInCreateInput } from 'src/app/domain/models/client/stand-in/stand-in-create-input.interface';
import { IStandInConvertInput } from 'src/app/domain/models/client/stand-in/stand-in-convert-input.interface';
import { STAND_IN_I18N, STAND_IN_MAX_BULK_COUNT } from 'src/app/domain/constants/stand-in.constants';
import { ADDRESS_VALIDATION_FAILED_KEY } from 'src/app/domain/helpers/address-validation-failure.helper';

describe('StandInService', () => {
  let service: StandInService;
  let api: { createStandIns: ReturnType<typeof vi.fn>; convertStandIn: ReturnType<typeof vi.fn> };
  let defaultTypePhone: WritableSignal<number>;

  const createInput = (overrides: Partial<IStandInCreateInput> = {}): IStandInCreateInput => ({
    count: 8,
    namePattern: 'Fair {n}',
    groupId: 'group-1',
    validFrom: new Date(2026, 10, 9),
    validUntil: new Date(2026, 10, 12),
    qualificationIds: ['q-1', 'q-1', 'q-2'],
    ...overrides,
  });

  const convertInput = (overrides: Partial<IStandInConvertInput> = {}): IStandInConvertInput => ({
    targetType: EntityTypeEnum.externEmp,
    firstName: ' Anna ',
    name: 'Muster',
    gender: GenderEnum.female,
    street: 'Hauptstrasse 1',
    zip: '3000',
    city: 'Bern',
    country: 'CH',
    phone: '',
    email: 'anna@example.com',
    ...overrides,
  });

  beforeEach(() => {
    api = {
      createStandIns: vi.fn().mockReturnValue(of([])),
      convertStandIn: vi.fn().mockReturnValue(of({})),
    };
    defaultTypePhone = signal(1);

    TestBed.configureTestingModule({
      providers: [
        StandInService,
        { provide: DataClientService, useValue: api },
        {
          provide: ClientConfigService,
          useValue: {
            defaultTypePhone,
            defaultTypeEmail: signal(-1),
            communicationTypePhoneList: signal([]),
            communicationTypeEmailList: signal([{ id: 1, name: 'Mail', type: 4, category: 1, defaultIndex: 0 }]),
          },
        },
      ],
    });
    service = TestBed.inject(StandInService);
  });

  describe('validateCreate', () => {
    it('accepts a count, a pattern with {n} once, a group and a start', () => {
      expect(service.validateCreate(createInput())).toBeNull();
    });

    it('refuses a count outside 1 to the bulk limit, or none', () => {
      for (const count of [0, STAND_IN_MAX_BULK_COUNT + 1, null, 2.5]) {
        expect(service.validateCreate(createInput({ count }))?.key).toBe(STAND_IN_I18N.invalidCount);
      }
    });

    it('refuses a pattern without {n}, with {n} twice or with nothing but {n}', () => {
      for (const namePattern of ['Fair', 'Fair {n} {n}', ' {n} ', 'x'.repeat(89) + '{n}']) {
        expect(service.validateCreate(createInput({ namePattern }))?.key).toBe(STAND_IN_I18N.invalidPattern);
      }
    });

    it('refuses a missing group', () => {
      expect(service.validateCreate(createInput({ groupId: '' }))?.key).toBe(STAND_IN_I18N.invalidGroup);
    });

    it('refuses a missing start and an end before the start, and accepts an open end', () => {
      expect(service.validateCreate(createInput({ validFrom: null }))?.key).toBe(STAND_IN_I18N.invalidPeriod);
      expect(service.validateCreate(createInput({ validUntil: new Date(2026, 10, 8) }))?.key).toBe(
        STAND_IN_I18N.invalidPeriod,
      );
      expect(service.validateCreate(createInput({ validUntil: null }))).toBeNull();
    });
  });

  it('sends the membership as calendar days and every qualification once', () => {
    service.createStandIns(createInput()).subscribe();

    expect(api.createStandIns).toHaveBeenCalledWith({
      count: 8,
      namePattern: 'Fair {n}',
      groupId: 'group-1',
      validFrom: '2026-11-09',
      validUntil: '2026-11-12',
      qualificationIds: ['q-1', 'q-2'],
    });
  });

  describe('validateConvert', () => {
    it('accepts a person with name, gender and a complete address', () => {
      expect(service.validateConvert(convertInput())).toBeNull();
    });

    it('refuses a customer as target, a missing first name or gender, and a name above 100 characters', () => {
      for (const overrides of [
        { targetType: EntityTypeEnum.customer },
        { targetType: EntityTypeEnum.standIn },
        { firstName: ' ' },
        { gender: null },
        { gender: GenderEnum.legalEntity },
        { name: 'x'.repeat(101) },
      ]) {
        expect(service.validateConvert(convertInput(overrides))?.key).toBe(STAND_IN_I18N.invalidPerson);
      }
    });

    it('refuses a half-filled address and accepts none at all', () => {
      expect(service.validateConvert(convertInput({ city: '' }))?.key).toBe(STAND_IN_I18N.invalidAddress);
      expect(service.validateConvert(convertInput({ street: '', zip: '', city: '', country: '' }))).toBeNull();
    });
  });

  it('sends the person with a new address valid from today and only the filled communications', () => {
    service.convertStandIn('stand-in-1', convertInput()).subscribe();

    const [clientId, request] = api.convertStandIn.mock.calls[0];
    expect(clientId).toBe('stand-in-1');
    expect(request).toEqual(
      expect.objectContaining({
        targetType: EntityTypeEnum.externEmp,
        firstName: 'Anna',
        name: 'Muster',
        gender: GenderEnum.female,
        communications: [{ type: 4, value: 'anna@example.com', prefix: '' }],
      }),
    );
    expect(request.address).toEqual(
      expect.objectContaining({ type: AddressTypeEnum.customer, street: 'Hauptstrasse 1', zip: '3000', city: 'Bern', country: 'CH' }),
    );
    expect(request.address.validFrom).toMatch(/T00:00:00\.000Z$/);
    expect(request.address).not.toHaveProperty('id');
  });

  it('sends no address when none was entered', () => {
    service.convertStandIn('stand-in-1', convertInput({ street: '', zip: '', city: '', country: '' })).subscribe();

    expect(api.convertStandIn.mock.calls[0][1].address).toBeNull();
  });

  it('sends a phone number with the default phone type', () => {
    service.convertStandIn('stand-in-1', convertInput({ phone: '079 123 45 67', email: '' })).subscribe();

    expect(api.convertStandIn.mock.calls[0][1].communications).toEqual([{ type: 1, value: '079 123 45 67', prefix: '' }]);
  });

  describe('failureMessage', () => {
    it('names the refused address with the geocoding key', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { errors: { 'Resource.Address': ['address.validation.failed|Hauptstrasse 1, 3000 Bern'] } },
      });

      expect(service.failureMessage(error, STAND_IN_I18N.convertFailed)).toEqual({
        key: ADDRESS_VALIDATION_FAILED_KEY,
        params: { address: 'Hauptstrasse 1, 3000 Bern' },
      });
    });

    it('falls back to the dialog key for any other failure, never to the server text', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { errors: { 'Resource.TargetType': ['A stand-in can only be converted into an employee.'] } },
      });

      expect(service.failureMessage(error, STAND_IN_I18N.convertFailed)).toEqual({ key: STAND_IN_I18N.convertFailed });
      expect(service.failureMessage(new Error('offline'), STAND_IN_I18N.createFailed)).toEqual({
        key: STAND_IN_I18N.createFailed,
      });
    });
  });
});
