import { MessageLibrary } from '../helpers/string-constants';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseEntity,
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import { transformDateToNgbDateStruct } from '../helpers/format-helper';
import { IBreak } from './break-class';
import { MultiLanguage } from './multi-language-class';
import { StateCountryToken } from './calendar-rule-class';

export interface IPostCodeCH {
  id: number;
  name: number;
  zip: string;
  city: string;
  state: string;
}

export interface ICountry {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  prefix: string;
  select: boolean;
  isDirty: number;
}

export interface IState {
  id: string | undefined;
  abbreviation: string;
  name?: MultiLanguage | undefined;
  countryPrefix: string;
  prefix: string;
  select: boolean;
  isDirty: number;
}

export interface ICategory {
  category: string | undefined;
  select: boolean | undefined;
}

export interface IFilter extends IBaseFilter {
  scopeFromFlag: boolean | undefined;
  scopeUntilFlag: boolean | undefined;
  scopeFrom: Date | undefined;
  internalScopeFrom: NgbDateStruct | undefined;
  scopeUntil: Date | undefined;
  internalScopeUntil: NgbDateStruct | undefined;
  showDeleteEntries: boolean | undefined;

  macroFilter: string | undefined;
  clientType: number | undefined;

  searchOnlyByName: boolean | undefined;

  male: boolean | undefined;
  female: boolean | undefined;
  legalEntity: boolean | undefined;

  companyAddress: boolean | undefined;
  invoiceAddress: boolean | undefined;
  homeAddress: boolean | undefined;

  countriesHaveBeenReadIn: boolean;
  countries: ICountry[];

  activeMembership: boolean | undefined;
  formerMembership: boolean | undefined;
  futureMembership: boolean | undefined;

  hasAnnotation: boolean | undefined;

  list: StateCountryToken[];
  filteredStateToken: StateCountryToken[];
}

export interface ITruncatedFilter {
  searchString: string | undefined;
  orderBy: string;
  sortOrder: string;
  numberOfItemsPerPage: number;
  requiredPage: number;
}

export interface ITruncatedClient extends IBaseTruncated {
  clients: IClient[];
  editor: string;
  lastChange: Date | string;
}

export interface IClient extends BaseEntity {
  id: string | undefined;
  idNumber: number;
  company: string;
  title: string;
  name: string;
  firstName: string;
  secondName: string;
  maidenName: string;
  birthdate: Date | undefined;
  membership: IMembership | undefined;
  gender: string;
  legalEntity: boolean;
  type: number | string;
  addresses: Array<IAddress>;
  communications: Array<ICommunication>;
  annotations: Array<IAnnotation>;
  internalBirthdate: NgbDateStruct | undefined;

  hasFutureAddress: boolean;
  hasPastAddress: boolean;
  hasScopeAddress: boolean;

  typeAbbreviation: string | undefined;
}

export interface IAddress extends BaseEntity {
  id: string | undefined;
  clientId: string | undefined;
  validFrom: Date;
  type: number;
  addressLine1: string;
  addressLine2: string;
  street: string;
  street2: string;
  street3: string;
  zip: string;
  city: string;
  state: string;
  country: string;
  isScoped: boolean;
  isFuture: boolean;

  internalValidFrom: NgbDateStruct | undefined;
}

export interface ICommunication {
  prefix: string;
  isPhone: boolean;
  isEmail: boolean;
  id: string | undefined;
  clientId: string | undefined;
  type: number;
  value: string;
  index: number;
  internalId: string | undefined;
}

export interface IMembership {
  id: string | undefined;
  clientId: string | undefined;
  client: IClient | undefined;
  validFrom: Date;
  validUntil: Date | undefined;

  type: number | string;
  internalValidFrom: NgbDateStruct | undefined;
  internalValidUntil: NgbDateStruct | undefined;
}

export interface IAnnotation {
  id: string | undefined;
  clientId: string | undefined;
  note: string | undefined;
}

export class TruncatedClient extends BaseTruncated implements ITruncatedClient {
  clients = [];
  editor = '';
  lastChange = '';
}

export class Address extends BaseEntity implements IAddress {
  id = '';
  clientId = '';
  validFrom = new Date();
  type = 0;
  addressLine1 = '';
  addressLine2 = '';
  street = '';
  street2 = '';
  street3 = '';
  zip = '';
  city = '';
  state = '';
  country = '';
  isScoped = true;
  isFuture = false;
  internalValidFrom = undefined;
}

export class Communication implements ICommunication {
  prefix = '';
  id = '';
  clientId = '';
  type = 0;
  value = '';
  isPhone = false;
  isEmail = false;
  index = 0;
  internalId = undefined;
}

export class Annotation extends BaseEntity implements IAnnotation {
  id = '';
  clientId = '';
  note = '';
}

export class Client extends BaseEntity implements IClient {
  constructor() {
    super();
    this.communications = [];

    const addr = new Address();
    this.addresses = [addr];

    const ann = new Annotation();
    this.annotations = [ann];
  }

  id = '';
  idNumber = -1;
  company = '';
  title = '';
  name = '';
  firstName = '';
  secondName = '';
  maidenName = '';
  birthdate = new Date();
  gender = '0';
  legalEntity = false;
  type = 0;

  membership = new Membership();
  addresses: Array<IAddress>;
  communications: Array<ICommunication>;
  annotations: Array<IAnnotation>;

  internalBirthdate = undefined;

  hasFutureAddress = false;
  hasPastAddress = false;
  hasScopeAddress = false;

  typeAbbreviation = undefined;
}

export class Membership implements IMembership {
  id = '';
  clientId = '';
  client = undefined;
  validFrom = new Date();
  validUntil = undefined;

  type = 0;

  internalValidFrom: NgbDateStruct = transformDateToNgbDateStruct(new Date())!;
  internalValidUntil = undefined;
}

export class Filter extends BaseFilter implements IFilter {
  scopeFromFlag = undefined;
  scopeUntilFlag = undefined;
  scopeFrom = undefined;
  internalScopeFrom = undefined;
  scopeUntil = undefined;
  internalScopeUntil = undefined;
  showDeleteEntries = false;

  includeAddress = false;
  macroFilter = '';
  clientType = -1;
  searchOnlyByName = undefined;

  countriesHaveBeenReadIn = false;
  override numberOfItemsPerPage = 0;
  override requiredPage = 0;

  override orderBy = 'name';
  override sortOrder = 'asc';

  clientTypeIndex = -1;

  male = true;
  female = true;
  legalEntity = true;

  companyAddress = true;
  invoiceAddress = true;
  homeAddress = true;
  countries: ICountry[] = [];

  activeMembership = true;
  formerMembership = false;
  futureMembership = false;

  hasAnnotation = false;

  list: StateCountryToken[] = [];
  filteredStateToken: StateCountryToken[] = [];

  emptyPlaceholder(): boolean {
    return (
      this.clientType === -1 &&
      this.macroFilter === '' &&
      !this.showDeleteEntries &&
      this.male &&
      this.female &&
      this.legalEntity &&
      this.companyAddress &&
      this.invoiceAddress &&
      this.homeAddress &&
      this.activeMembership &&
      !this.formerMembership &&
      !this.futureMembership &&
      !this.hasAnnotation &&
      this.stateStatus() &&
      this.countriesStatus() &&
      this.scopeFrom === undefined &&
      this.scopeUntil === undefined &&
      this.scopeFromFlag === undefined &&
      this.scopeUntilFlag === undefined &&
      this.internalScopeFrom === undefined &&
      this.internalScopeUntil === undefined
    );
  }

  setEmpty() {
    this.showDeleteEntries = false;
    this.macroFilter = '';
    this.clientType = -1;

    this.scopeFrom = undefined;
    this.scopeUntil = undefined;
    this.scopeFromFlag = undefined;
    this.scopeUntilFlag = undefined;
    this.internalScopeFrom = undefined;
    this.internalScopeUntil = undefined;

    this.male = true;
    this.female = true;
    this.legalEntity = true;
    this.companyAddress = true;
    this.invoiceAddress = true;
    this.homeAddress = true;

    this.activeMembership = true;
    this.formerMembership = false;
    this.futureMembership = false;

    this.hasAnnotation = false;

    this.selectState(true);
    this.selectCountries(true);
  }

  selectState(value: boolean) {
    this.filteredStateToken.forEach((x) => {
      x.select = value;
    });
  }

  selectCountries(value: boolean) {
    this.countries.forEach((x) => {
      x.select = value;
    });
    this.resetFilteredStateToken();
  }

  stateStatus(): boolean {
    var res = true;
    this.list.forEach((x) => {
      res && x.select;
    });
    return res;
  }

  countriesStatus(): boolean {
    let status = true;

    if (this.countries && this.countries.length !== 0) {
      this.countries.forEach((country) => {
        if (!country.select) {
          status = false;
        }
      });
    }

    return status;
  }

  resetFilteredStateToken() {
    const countries = this.countries
      .filter((x) => x.select === true)
      .map((x) => x.abbreviation);
    this.filteredStateToken = this.list.filter((x) =>
      countries.includes(x.country)
    );
  }

  setFilteredStateToken(value: StateCountryToken) {
    const filterState = this.filteredStateToken.find((x) => x.id === value.id);
    if (filterState) {
      filterState.select = value.select;
    }
    const filterList = this.list.find((x) => x.id === value.id);
    if (filterList) {
      filterList.select = value.select;
    }
  }

  isFilterValid(): boolean {
    return this.numberOfItemsPerPage > 0;
  }
}

export class TruncatedFilter implements ITruncatedFilter {
  searchString = '';
  orderBy = 'name';
  sortOrder = 'asc';
  numberOfItemsPerPage = 0;
  requiredPage = 0;
}

export interface ICheckBoxValue {
  id: string;
  checked: boolean;
}

export class CheckBoxValue implements ICheckBoxValue {
  id = '';
  checked = false;
}

export interface ICommunicationType {
  id: number;
  name: string;
  type: number;
  category: number;
  defaultIndex: number;
}

export class CommunicationType implements ICommunicationType {
  id = 0;
  name = '';
  type = 0;
  category = 0;
  defaultIndex = 0;
}

export interface ICommunicationPrefix {
  id: string;
  prefix: string;
  name: string;
}

export class CommunicationPrefix implements ICommunicationPrefix {
  id = '';
  prefix = '';
  name = '';
}

export class Country implements ICountry {
  id = '';
  abbreviation = '';
  name?: MultiLanguage | undefined = undefined;
  prefix = '';
  select = false;
  isDirty = 0;
}

export class State implements IState {
  id = '';
  abbreviation = '';
  name?: MultiLanguage | undefined = undefined;
  countryPrefix = '';
  prefix = '';
  select = false;
  isDirty = 0;
}

export interface IClientAttribute {
  id: string | undefined;
  type: number;
  name: string;
}

export interface IClientAttribute {
  id: string | undefined;
  type: number;
  name: string;
}

export class ClientAttribute implements IClientAttribute {
  id = undefined;
  type = 0;
  name = MessageLibrary.NOT_DEFINED;
}

export interface ILastChangeMetaData {
  lastChangesDate: Date;
  autor: string;
}

export interface IExportClient {
  filter: IFilter;
  selection: string[];
  selectAll: boolean;
  invertedSelection: boolean;
  type: number | undefined;
}

export class ExportClient implements IExportClient {
  filter = new Filter();
  selection: string[] = [];
  selectAll = false;
  invertedSelection = false;
  type = undefined;
}

export interface IClientBreak {
  id: string | undefined;
  idNumber: number;
  company: string;
  title: string;
  name: string;
  firstName: string;
  secondName: string;
  maidenName: string;
  birthdate: Date | undefined;
  membership: IMembership | undefined;
  gender: string;
  legalEntity: boolean;
  type: number | string;

  breaks: Array<IBreak>;
}

export interface IClientBreak {
  id: string | undefined;
  idNumber: number;
  company: string;
  title: string;
  name: string;
  firstName: string;
  secondName: string;
  maidenName: string;
  birthdate: Date | undefined;
  membership: IMembership | undefined;
  gender: string;
  legalEntity: boolean;
  type: number | string;
  breaks: Array<IBreak>;
}

export class ClientBreak implements IClientBreak {
  id = '';
  idNumber = -1;
  company = '';
  title = '';
  name = '';
  firstName = '';
  secondName = '';
  maidenName = '';
  birthdate = new Date();
  gender = '0';
  legalEntity = false;
  type = 0;

  membership = new Membership();
  breaks: Array<IBreak> = [];
}

export { MultiLanguage };
