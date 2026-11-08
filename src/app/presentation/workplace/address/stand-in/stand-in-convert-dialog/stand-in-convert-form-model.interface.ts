// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Form values of the "Convert into employee" dialog; the select fields hold the enum numbers as text.
 * @param targetType - EntityTypeEnum.employee or externEmp as text
 * @param gender - GenderEnum value as text, empty while nothing is chosen
 * @param country - Country abbreviation of the address
 */
export interface StandInConvertFormModel {
  targetType: string;
  firstName: string;
  name: string;
  gender: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}
