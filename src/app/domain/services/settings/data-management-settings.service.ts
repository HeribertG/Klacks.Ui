import { Injectable, inject, signal, computed } from '@angular/core';
import { ILoadable, IResettable, ISaveable } from 'src/app/domain/interfaces/manageable.interface';
import { UserAdministrationManagementService } from './user-administration-management.service';
import { AppSettingsManagementService } from './app-settings-management.service';
import { MacroManagementService } from './macro-management.service';
import { CountryStateManagementService } from './country-state-management.service';
import { BranchManagementService } from './branch-management.service';
import { GridColorService } from './grid-color.service';
import { IAuthentication, ChangePassword } from 'src/app/domain/models/authentification-class';
import { IMacro } from 'src/app/domain/models/macro-class';
import { ICountry, IState } from 'src/app/domain/models/client-class';
import { IBranch } from 'src/app/domain/models/branch';

/**
 * Facade service that coordinates all settings-related operations.
 * Delegates to specialized services for different concerns:
 * - User Administration
 * - App Settings (Contact & Email)
 * - Macros
 * - Countries & States
 * - Grid Colors
 */
@Injectable({
  providedIn: 'root',
})
export class DataManagementSettingsService implements ISaveable, IResettable, ILoadable {
  // Injected sub-services
  private userAdminService = inject(UserAdministrationManagementService);
  private appSettingsService = inject(AppSettingsManagementService);
  private macroService = inject(MacroManagementService);
  public countryStateService = inject(CountryStateManagementService);
  public branchService = inject(BranchManagementService);
  public gridColorService = inject(GridColorService);

  // IManageable implementation
  private _showProgressSpinner = computed(() =>
    this.userAdminService.isLoading() ||
    this.appSettingsService.isLoading() ||
    this.macroService.isLoading()
  );

  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isReset = signal(false);

  public onSaveCompleted?: () => void;
  public settingsChangeTrigger = signal<number>(0);

  // =============================
  // User Administration - Delegated
  // =============================

  get accountsList(): IAuthentication[] {
    return this.userAdminService.accountsList();
  }

  get accountCount(): number {
    return this.accountsList.length;
  }

  get CurrentAccountId(): string {
    return this.userAdminService.currentAccountId();
  }

  set CurrentAccountId(value: string) {
    this.userAdminService.currentAccountId.set(value);
  }

  readAccountsList(): void {
    // Already loaded in UserAdministrationManagementService constructor
    // This method exists for backwards compatibility
  }

  addAccount(value: IAuthentication): void {
    this.userAdminService.addAccount(value);
  }

  deleteAccount(id: string): void {
    this.userAdminService.deleteAccount(id);
  }

  saveAccountsRole(): void {
    this.accountsList.forEach((account) => {
      if (account.isAdmin !== undefined) {
        this.userAdminService.updateAccountRole(account, 'Admin', account.isAdmin);
      }
      if (account.isAuthorised !== undefined) {
        this.userAdminService.updateAccountRole(account, 'Authorised', account.isAuthorised);
      }
    });
  }

  sentPassword(value: ChangePassword): void {
    this.userAdminService.sendPasswordResetEmail(value);
  }

  requestPasswordReset(email: string): void {
    this.userAdminService.requestPasswordReset(email);
  }

  // =============================
  // App Settings - Delegated
  // =============================

  // Contact Settings
  get appName(): string {
    return this.appSettingsService.contactSettings().name;
  }

  set appName(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, name: value }));
  }

  get appAddressName(): string {
    return this.appSettingsService.contactSettings().addressName;
  }

  set appAddressName(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, addressName: value }));
  }

  get appSupplementAddress(): string {
    return this.appSettingsService.contactSettings().supplementAddress;
  }

  set appSupplementAddress(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, supplementAddress: value }));
  }

  get appAddressAddress(): string {
    return this.appSettingsService.contactSettings().address;
  }

  set appAddressAddress(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, address: value }));
  }

  get appAddressZip(): string {
    return this.appSettingsService.contactSettings().zip;
  }

  set appAddressZip(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, zip: value }));
  }

  get appAddressPlace(): string {
    return this.appSettingsService.contactSettings().place;
  }

  set appAddressPlace(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, place: value }));
  }

  get appAddressPhone(): string {
    return this.appSettingsService.contactSettings().phone;
  }

  set appAddressPhone(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, phone: value }));
  }

  get appAddressMail(): string {
    return this.appSettingsService.contactSettings().email;
  }

  set appAddressMail(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, email: value }));
  }

  get appAddressAccountingStart(): number {
    return this.appSettingsService.contactSettings().accountingStart;
  }

  set appAddressAccountingStart(value: number) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, accountingStart: value }));
  }

  get mark(): string {
    return this.appSettingsService.contactSettings().mark;
  }

  set mark(value: string) {
    this.appSettingsService.contactSettings.update(s => ({ ...s, mark: value }));
  }

  // Email Settings
  get outgoingServer(): string {
    return this.appSettingsService.emailSettings().outgoingServer;
  }

  set outgoingServer(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, outgoingServer: value }));
  }

  get outgoingServerPort(): string {
    return this.appSettingsService.emailSettings().outgoingServerPort;
  }

  set outgoingServerPort(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, outgoingServerPort: value }));
  }

  get enabledSSL(): string {
    return this.appSettingsService.emailSettings().enabledSSL;
  }

  set enabledSSL(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, enabledSSL: value }));
  }

  get outgoingServerTimeout(): string {
    return this.appSettingsService.emailSettings().outgoingServerTimeout;
  }

  set outgoingServerTimeout(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, outgoingServerTimeout: value }));
  }

  get authenticationType(): string {
    return this.appSettingsService.emailSettings().authenticationType;
  }

  set authenticationType(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, authenticationType: value }));
  }

  get readReceipt(): string {
    return this.appSettingsService.emailSettings().readReceipt;
  }

  set readReceipt(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, readReceipt: value }));
  }

  get replyTo(): string {
    return this.appSettingsService.emailSettings().replyTo;
  }

  set replyTo(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, replyTo: value }));
  }

  get dispositionNotification(): string {
    return this.appSettingsService.emailSettings().dispositionNotification;
  }

  set dispositionNotification(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, dispositionNotification: value }));
  }

  get outgoingserverUsername(): string {
    return this.appSettingsService.emailSettings().username;
  }

  set outgoingserverUsername(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, username: value }));
  }

  get outgoingserverPassword(): string {
    return this.appSettingsService.emailSettings().password;
  }

  set outgoingserverPassword(value: string) {
    this.appSettingsService.emailSettings.update(s => ({ ...s, password: value }));
  }

  readSettingList(): void {
    this.appSettingsService.loadSettings();
  }

  // =============================
  // Countries & States - Delegated
  // =============================

  get countriesList(): ICountry[] {
    return this.countryStateService.countriesList();
  }

  get statesList(): IState[] {
    return this.countryStateService.statesList();
  }

  readCountryList(): void {
    this.countryStateService.loadCountriesAndStates();
  }

  readStateList(): void {
    this.countryStateService.loadCountriesAndStates();
  }

  // =============================
  // Branches - Delegated
  // =============================

  get branchesList(): IBranch[] {
    return this.branchService.branchesList();
  }

  readBranchList(): void {
    this.branchService.loadBranches();
  }

  // =============================
  // Macros - Delegated
  // =============================

  get macroList(): IMacro[] {
    return this.macroService.macroList();
  }

  set macroList(value: IMacro[]) {
    this.macroService.macroList.set(value);
  }

  get macroListCount(): number {
    return this.macroList.length;
  }

  readMacroList(): void {
    this.macroService.loadMacros();
  }

  // =============================
  // IManageable implementation
  // =============================

  areObjectsDirty(): boolean {
    return (
      this.appSettingsService.isDirty() ||
      this.countryStateService.isCountriesDirty() ||
      this.countryStateService.isStatesDirty() ||
      this.branchService.isBranchesDirty() ||
      this.macroService.isDirty() ||
      this.gridColorService.isSetting_Dirty()
    );
  }

  save(): void {
    let hasOperations = false;

    if (this.appSettingsService.isDirty()) {
      this.appSettingsService.save();
      hasOperations = true;
    }

    if (this.countryStateService.isCountriesDirty()) {
      this.countryStateService.saveCountries();
      hasOperations = true;
    }

    if (this.countryStateService.isStatesDirty()) {
      this.countryStateService.saveStates();
      hasOperations = true;
    }

    if (this.branchService.isBranchesDirty()) {
      this.branchService.saveBranches();
      hasOperations = true;
    }

    if (this.macroService.isDirty()) {
      this.macroService.save();
      hasOperations = true;
    }

    if (this.gridColorService.isSetting_Dirty()) {
      this.gridColorService.save();
      hasOperations = true;
    }

    if (!hasOperations && this.onSaveCompleted) {
      this.onSaveCompleted();
    }
  }

  readData(): void {
    this.appSettingsService.loadSettings();
    this.countryStateService.loadCountriesAndStates();
    this.branchService.loadBranches();
    this.macroService.loadMacros();
    // UserAdministrationManagementService loads automatically in constructor

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  resetData(): void {
    this.appSettingsService.resetData();
    this.countryStateService.loadCountriesAndStates();
    this.branchService.loadBranches();
    this.macroService.resetData();
    this.gridColorService.readData();

    this.isReset.set(true);
    setTimeout(() => this.isReset.set(false), 100);
  }

  goBack(): string {
    return '';
  }

  public destroy(): void {
    this.userAdminService.destroy();
    this.macroService.destroy();
  }
}
