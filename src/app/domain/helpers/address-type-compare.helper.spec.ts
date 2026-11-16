// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import { Address } from 'src/app/domain/models/client/address';
import { compareAddressesByType } from './address-type-compare.helper';

const buildAddress = (id: string, type: AddressTypeEnum): Address => Object.assign(new Address(), { id, type });

describe('compareAddressesByType', () => {
  const customer = buildAddress('customer', AddressTypeEnum.customer);
  const workplace = buildAddress('workplace', AddressTypeEnum.workplace);
  const otherCustomer = buildAddress('other-customer', AddressTypeEnum.customer);

  it('returns a negative number when the first type is lower', () => {
    expect(compareAddressesByType(customer, workplace)).toBeLessThan(0);
  });

  it('returns a positive number when the first type is higher', () => {
    expect(compareAddressesByType(workplace, customer)).toBeGreaterThan(0);
  });

  it('returns 0 for equal types in both argument orders', () => {
    expect(compareAddressesByType(customer, otherCustomer)).toBe(0);
    expect(compareAddressesByType(otherCustomer, customer)).toBe(0);
  });

  it('is antisymmetric for every pair', () => {
    const all = [customer, workplace, otherCustomer];
    for (const a of all) {
      for (const b of all) {
        expect(Math.sign(compareAddressesByType(a, b)) + Math.sign(compareAddressesByType(b, a))).toBe(0);
      }
    }
  });

  it('keeps the input order of equal types regardless of how they were passed in', () => {
    expect([customer, otherCustomer, workplace].sort(compareAddressesByType).map((a) => a.id)).toEqual([
      'customer',
      'other-customer',
      'workplace',
    ]);
    expect([workplace, otherCustomer, customer].sort(compareAddressesByType).map((a) => a.id)).toEqual([
      'other-customer',
      'customer',
      'workplace',
    ]);
  });
});
