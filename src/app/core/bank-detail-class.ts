export interface IBankDetail {
  id: string | undefined;
  position: number;
  accountDescription: string | null;
  paymentSlipAddress: string | null;
  accountNumber: string | null;
  subscriberNumber: string | null;
  company: string | null;
  title: string | null;
  name: string | null;
  additionLine: string | null;
  street: string | null;
  street2: string | null;
  street3: string | null;
  zip: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isDirty: number | null;
}

export class BankDetail implements IBankDetail {
  id = undefined;
  position = 0;
  accountDescription = null;
  paymentSlipAddress = null;
  accountNumber = null;
  subscriberNumber = null;
  company = null;
  title = null;
  name = null;
  additionLine = null;
  street = null;
  street2 = null;
  street3 = null;
  zip = null;
  city = null;
  state = null;
  country = null;
  isDirty = 0;
}
