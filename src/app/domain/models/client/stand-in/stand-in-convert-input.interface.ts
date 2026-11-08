// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * What the user enters to turn a stand-in into a person. The address is optional but all or nothing (street, zip, city
 * and country), phone and e-mail are optional.
 * @param targetType - EntityTypeEnum.employee or EntityTypeEnum.externEmp
 * @param gender - GenderEnum.female, male or intersexuality
 * @param country - Country abbreviation of the address, e.g. "CH"
 */
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';

export interface IStandInConvertInput {
  targetType: EntityTypeEnum;
  firstName: string;
  name: string;
  gender: GenderEnum | null;
  street: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}
