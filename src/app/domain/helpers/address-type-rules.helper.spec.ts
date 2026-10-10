import { AddressTypeEnum, EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import {
  findDisallowedAddressTypes,
  getAllowedAddressTypes,
  isAddressTypeAllowed,
} from './address-type-rules.helper';

const UNKNOWN_ENTITY_TYPE = 99;
const UNKNOWN_ADDRESS_TYPE = 42;

describe('address type rules helper', () => {
  describe('getAllowedAddressTypes', () => {
    it.each([
      ['employee', EntityTypeEnum.employee, [AddressTypeEnum.customer]],
      ['external employee', EntityTypeEnum.externEmp, [AddressTypeEnum.customer, AddressTypeEnum.workplace]],
      [
        'customer',
        EntityTypeEnum.customer,
        [AddressTypeEnum.customer, AddressTypeEnum.workplace, AddressTypeEnum.invoicingAddress],
      ],
    ])('returns the rule table entry for %s', (_label, entityType, expected) => {
      expect(getAllowedAddressTypes(entityType)).toEqual(expected);
    });

    it('allows every address type for an unknown client type', () => {
      expect(getAllowedAddressTypes(UNKNOWN_ENTITY_TYPE)).toEqual([
        AddressTypeEnum.customer,
        AddressTypeEnum.workplace,
        AddressTypeEnum.invoicingAddress,
      ]);
    });

    it('returns a copy that does not alter the rule table', () => {
      getAllowedAddressTypes(EntityTypeEnum.employee).push(AddressTypeEnum.invoicingAddress);

      expect(getAllowedAddressTypes(EntityTypeEnum.employee)).toEqual([AddressTypeEnum.customer]);
    });
  });

  describe('isAddressTypeAllowed', () => {
    it('rejects workplace and invoicing addresses for an employee', () => {
      expect(isAddressTypeAllowed(EntityTypeEnum.employee, AddressTypeEnum.customer)).toBe(true);
      expect(isAddressTypeAllowed(EntityTypeEnum.employee, AddressTypeEnum.workplace)).toBe(false);
      expect(isAddressTypeAllowed(EntityTypeEnum.employee, AddressTypeEnum.invoicingAddress)).toBe(false);
    });

    it('rejects only the invoicing address for an external employee', () => {
      expect(isAddressTypeAllowed(EntityTypeEnum.externEmp, AddressTypeEnum.workplace)).toBe(true);
      expect(isAddressTypeAllowed(EntityTypeEnum.externEmp, AddressTypeEnum.invoicingAddress)).toBe(false);
    });

    it('accepts every address type for a customer', () => {
      expect(isAddressTypeAllowed(EntityTypeEnum.customer, AddressTypeEnum.invoicingAddress)).toBe(true);
    });

    it('accepts any address type for an unknown client type', () => {
      expect(isAddressTypeAllowed(UNKNOWN_ENTITY_TYPE, AddressTypeEnum.invoicingAddress)).toBe(true);
    });

    it('rejects an unknown address type', () => {
      expect(isAddressTypeAllowed(EntityTypeEnum.customer, UNKNOWN_ADDRESS_TYPE)).toBe(false);
    });
  });

  describe('findDisallowedAddressTypes', () => {
    const addresses = [
      { type: AddressTypeEnum.invoicingAddress },
      { type: AddressTypeEnum.customer },
      { type: AddressTypeEnum.workplace },
      { type: AddressTypeEnum.invoicingAddress },
    ];

    it('returns the distinct blocked types of an employee in ascending order', () => {
      expect(findDisallowedAddressTypes(EntityTypeEnum.employee, addresses)).toEqual([
        AddressTypeEnum.workplace,
        AddressTypeEnum.invoicingAddress,
      ]);
    });

    it('returns only the invoicing address for an external employee', () => {
      expect(findDisallowedAddressTypes(EntityTypeEnum.externEmp, addresses)).toEqual([
        AddressTypeEnum.invoicingAddress,
      ]);
    });

    it('returns an empty list for a customer, an unknown client type and no addresses', () => {
      expect(findDisallowedAddressTypes(EntityTypeEnum.customer, addresses)).toEqual([]);
      expect(findDisallowedAddressTypes(UNKNOWN_ENTITY_TYPE, addresses)).toEqual([]);
      expect(findDisallowedAddressTypes(EntityTypeEnum.employee, [])).toEqual([]);
    });
  });
});
