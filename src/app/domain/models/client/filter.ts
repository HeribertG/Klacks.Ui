// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Client filter with country/state filtering, membership status, and gender/address type toggles.
 * @param countries - List of selectable countries for filtering
 * @param list - Full list of state/country tokens
 * @param filteredStateToken - Subset of state tokens filtered by selected countries
 */

import { BaseFilter } from '../general-class';
import { StateCountryToken } from '../calendar/calendar-rule-class';
import { IFilter } from './i-filter';
import { ICountry } from './i-country';

export class Filter extends BaseFilter implements IFilter {
  scopeFromFlag: boolean | undefined = undefined;
  scopeUntilFlag: boolean | undefined = undefined;
  scopeFrom: Date | undefined = undefined;
  scopeUntil: Date | undefined = undefined;
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
  intersexuality = true;

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

  selectedGroup: string | undefined = undefined;

  employee = true;
  externEmp = true;
  customer = true;

  emptyPlaceholder(): boolean {
    return (
      this.clientType === -1 &&
      this.macroFilter === '' &&
      !this.showDeleteEntries &&
      this.male &&
      this.female &&
      this.legalEntity &&
      this.intersexuality &&
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
      this.employee &&
      this.externEmp &&
      this.customer
    );
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
    let res = true;
    this.list.forEach((x) => {
      res = res && x.select;
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
