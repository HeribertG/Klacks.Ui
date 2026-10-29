// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAddressEntry } from '../services/address-entry.interface';
import { resolveContainerBaseAddress, unlistedContainerBases } from './container-base-address.helper';

describe('container base address helper', () => {
  const company: IAddressEntry = { name: 'Spitex', address: 'Bahnhofstrasse 1, 8400 Winterthur', isAppAddress: true };
  const branch: IAddressEntry = { name: 'Filiale Seen', address: 'Seenerstrasse 5, 8405 Winterthur', isAppAddress: false };
  const addresses = [company, branch];

  describe('resolveContainerBaseAddress', () => {
    it('resolves a stored name to the address of that entry', () => {
      expect(resolveContainerBaseAddress('Filiale Seen', addresses)).toBe(branch.address);
    });

    it('keeps a stored address that is in the list', () => {
      expect(resolveContainerBaseAddress(company.address, addresses)).toBe(company.address);
    });

    it('keeps a stored base that matches no entry instead of dropping it', () => {
      expect(resolveContainerBaseAddress('Winterthur', addresses)).toBe('Winterthur');
    });

    it('keeps a stored base when no addresses are known yet', () => {
      expect(resolveContainerBaseAddress('Winterthur', [])).toBe('Winterthur');
    });

    it('returns an empty base for a missing stored base', () => {
      expect(resolveContainerBaseAddress(undefined, addresses)).toBe('');
      expect(resolveContainerBaseAddress(null, addresses)).toBe('');
      expect(resolveContainerBaseAddress('', addresses)).toBe('');
    });
  });

  describe('unlistedContainerBases', () => {
    it('lists a selected base that is no known address once', () => {
      expect(unlistedContainerBases(['Winterthur', 'Winterthur'], addresses)).toEqual(['Winterthur']);
    });

    it('leaves out known addresses and empty bases', () => {
      expect(unlistedContainerBases([company.address, ''], addresses)).toEqual([]);
    });
  });
});
