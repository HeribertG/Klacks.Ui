// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum ClientImportTarget {
  Ignore = 'Ignore',
  FullName = 'FullName',
  FirstName = 'FirstName',
  LastName = 'LastName',
  Title = 'Title',
  Salutation = 'Salutation',
  Gender = 'Gender',
  Birthdate = 'Birthdate',
  Street = 'Street',
  HouseNumber = 'HouseNumber',
  AddressLine2 = 'AddressLine2',
  Zip = 'Zip',
  City = 'City',
  ZipCity = 'ZipCity',
  State = 'State',
  Country = 'Country',
  Email = 'Email',
  Phone = 'Phone',
  Mobile = 'Mobile',
  EntryDate = 'EntryDate',
  ExitDate = 'ExitDate',
  Contract = 'Contract',
  Group = 'Group',
  PersonnelNumber = 'PersonnelNumber',
  Note = 'Note',
}

export enum ClientImportDateFormat {
  DayMonthYear = 'DayMonthYear',
  MonthDayYear = 'MonthDayYear',
  YearMonthDay = 'YearMonthDay',
}

export enum ClientImportNameOrder {
  FirstLast = 'FirstLast',
  LastFirst = 'LastFirst',
}

export enum ClientImportRowStatus {
  Ready = 'Ready',
  Skipped = 'Skipped',
  Error = 'Error',
}

export enum ClientImportIssueSeverity {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
}

export enum ClientImportEmailType {
  PrivateMail = 'PrivateMail',
  OfficeMail = 'OfficeMail',
}

export enum ClientImportPhoneType {
  PrivateFixPhone = 'PrivateFixPhone',
  OfficeFixPhone = 'OfficeFixPhone',
}

export enum ClientImportMobileType {
  PrivateCellPhone = 'PrivateCellPhone',
  OfficeCellPhone = 'OfficeCellPhone',
}

export enum ClientImportFormerEmployeesHandling {
  Skip = 'Skip',
  ImportWithExitDate = 'ImportWithExitDate',
}

export enum ClientImportDuplicateHandling {
  Skip = 'Skip',
  CreateAnyway = 'CreateAnyway',
}

export enum ClientImportGender {
  Female = 'Female',
  Male = 'Male',
  Intersexuality = 'Intersexuality',
}

export enum ClientImportStep {
  File = 'File',
  Mapping = 'Mapping',
  Preview = 'Preview',
  Result = 'Result',
}
