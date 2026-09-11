// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ClientDataMapper } from './client-data.mapper';
import { Client } from 'src/app/domain/models/client/client';
import { ClientContract } from 'src/app/domain/models/client/client-contract';
import { ClientGroupItem } from 'src/app/domain/models/client/client-group-item-class';
import { IFilter } from 'src/app/domain/models/client/i-filter';
import { IMembership } from 'src/app/domain/models/client/i-membership';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

const mockClient = (): Client => {
  const client = new Client();
  client.id = 'client-123';
  client.birthdate = new Date(2020, 0, 1);
  const membership = client.membership as IMembership;
  membership.validFrom = new Date(2020, 1, 1);
  membership.validUntil = new Date(2020, 5, 30);
  client.addresses[0].validFrom = new Date(2020, 2, 1);

  const contract = new ClientContract();
  contract.fromDate = new Date(2020, 3, 1);
  contract.untilDate = new Date(2020, 6, 1);
  client.clientContracts = [contract];

  const groupItem = new ClientGroupItem();
  groupItem.validFrom = new Date(2020, 4, 1);
  groupItem.validUntil = new Date(2020, 7, 1);
  client.groupItems = [groupItem];

  return client;
};

describe('ClientDataMapper', () => {
  const ZONES = ['Asia/Kolkata', 'America/New_York'] as const;

  for (const zone of ZONES) {
    describe(zone, () => {
      let originalTz: string | undefined;

      beforeEach(() => {
        originalTz = currentTimeZone();
        process.env['TZ'] = zone;
      });

      afterEach(() => {
        process.env['TZ'] = originalTz;
      });

      it('maps all calendar fields to UTC midnight on mapForUpdate without mutating the input', () => {
        const client = mockClient();
        const originalBirthdate = client.birthdate;

        const mapped = ClientDataMapper.mapForUpdate(client);

        expect(mapped.birthdate).toBe('2020-01-01T00:00:00.000Z');
        expect(mapped.membership?.validFrom).toBe('2020-02-01T00:00:00.000Z');
        expect(mapped.membership?.validUntil).toBe('2020-06-30T00:00:00.000Z');
        expect(mapped.addresses[0].validFrom).toBe('2020-03-01T00:00:00.000Z');
        expect(mapped.clientContracts[0].fromDate).toBe('2020-04-01T00:00:00.000Z');
        expect(mapped.clientContracts[0].untilDate).toBe('2020-07-01T00:00:00.000Z');
        expect(mapped.groupItems[0].validFrom).toBe('2020-05-01T00:00:00.000Z');
        expect(mapped.groupItems[0].validUntil).toBe('2020-08-01T00:00:00.000Z');
        expect(client.birthdate).toBe(originalBirthdate);
      });

      it('maps all calendar fields to UTC midnight on mapForCreate without mutating the input', () => {
        const client = mockClient();
        const originalBirthdate = client.birthdate;

        const mapped = ClientDataMapper.mapForCreate(client);

        expect(mapped.birthdate).toBe('2020-01-01T00:00:00.000Z');
        expect(mapped.clientContracts[0].fromDate).toBe('2020-04-01T00:00:00.000Z');
        expect(client.birthdate).toBe(originalBirthdate);
      });

      it('maps scopeFrom/scopeUntil to UTC midnight on mapFilterDates without mutating the input', () => {
        const filter = { scopeFrom: new Date(2020, 0, 1), scopeUntil: new Date(2020, 5, 30) } as IFilter;

        const mapped = ClientDataMapper.mapFilterDates(filter);

        expect(mapped.scopeFrom).toBe('2020-01-01T00:00:00.000Z');
        expect(mapped.scopeUntil).toBe('2020-06-30T00:00:00.000Z');
        expect(filter.scopeFrom).toEqual(new Date(2020, 0, 1));
      });

      it('sends calendar fields that were loaded from the backend and never edited on their own day', () => {
        const client = mockClient();
        client.birthdate = '1990-08-03T00:00:00Z' as unknown as Date;
        const membership = client.membership as IMembership;
        membership.validFrom = '2020-02-01T00:00:00Z' as unknown as Date;
        client.addresses[0].validFrom = '2020-03-01T00:00:00Z' as unknown as Date;
        client.clientContracts[0].fromDate = '2020-04-01' as unknown as Date;
        client.groupItems[0].validFrom = '2020-05-01T00:00:00Z' as unknown as Date;

        const mapped = ClientDataMapper.mapForUpdate(client);

        expect(mapped.birthdate).toBe('1990-08-03T00:00:00.000Z');
        expect(mapped.membership?.validFrom).toBe('2020-02-01T00:00:00.000Z');
        expect(mapped.addresses[0].validFrom).toBe('2020-03-01T00:00:00.000Z');
        expect(mapped.clientContracts[0].fromDate).toBe('2020-04-01T00:00:00.000Z');
        expect(mapped.groupItems[0].validFrom).toBe('2020-05-01T00:00:00.000Z');
      });
    });
  }
});
