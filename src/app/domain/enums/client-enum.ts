export enum AtributeTypeEnum {
  Client,
  Membership,
  AnnualFee,
}

export enum AddressTypeEnum {
  customer,
  workplace,
  invoicingAddress,
}

export enum CommunicationTypeDefaultIndexEnum {
  phone = 1,
  email = 2,
}

export enum CreateEntriesEnum {
  undefined = 0,
  new = 1,
  rewrite = 2,
  delete = 3,
}

export enum ReminderTypeEnum {
  firstReminder = 1000,
  secondReminder = 1001,
  thirdReminder = 1002,
}

export enum TemplateTypeEnum {
  memberInvoice = 0,
  workshopInvoice = 200,
  otherInvoice = 300,
  workshopConfirmation = 101,
  firstReminder = 1000,
  secondReminder = 1001,
  thirdReminder = 1002,
}

export enum AttributebaseEnum {
  entity = 0,
  instance = 1,
  contribution = 2,
}

export enum GenderEnum {
  female = 0,
  male = 1,
  legalEntity = 3,
  intersexuality = 2,
}
