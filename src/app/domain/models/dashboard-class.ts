export interface IClientLocationResource {
  id: string;
  type: number;
  currentAddress: IAddressInfo | null;
}

export interface IAddressInfo {
  city: string;
  country: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
}
