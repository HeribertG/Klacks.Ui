// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Characterizes the address persona card with its real template: rendered fields per scenario, validation
 * classes, the load/index/legal-entity/sync effects and their change events, address actions,
 * communications, labels and the Telegram invitation.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateRef, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { AddressPersonaComponent } from './address-persona.component';
import { AddressPersonaAddressDialogsService } from './services/address-persona-address-dialogs.service';
import { AddressPersonaCommunicationService } from './services/address-persona-communication.service';
import { AddressPersonaDisplayService } from './services/address-persona-display.service';
import { AddressPersonaLabelsService } from './services/address-persona-labels.service';
import { AddressPersonaStateService } from './services/address-persona-state.service';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import {
  DataMessagingInvitationService,
  TelegramInvitationResult,
} from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import {
  EDIT_ADDRESS_CARD_KEYS,
  EditAddressCardVisibilityService,
} from 'src/app/presentation/workplace/address/edit-address/edit-address-card-visibility.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { AddressTypeEnum, EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { Address, ICommunication, IClient } from 'src/app/domain/models/client/client-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { formatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/presentation/helpers/ngb-date.helper';
import { createGeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';

const CLIENT_ID = 'client-1';
const MAIN_ADDRESS_ID = 'address-1';
const SECOND_ADDRESS_ID = 'address-2';
const RAW_PHONE = '0791234567';
const TELEGRAM_BUTTON_KEY = 'messaging.sendTelegramInvitation';
const ADDRESS_TYPE_NOT_ALLOWED_KEY =
  'address.edit-address.address-persona.validation.address-type-not-allowed-for-client-type';
const MD_MODAL_OPTIONS = { size: 'md', centered: true, windowClass: 'custom-class' };
const LG_MODAL_OPTIONS = { size: 'lg', centered: true, windowClass: 'custom-class' };
const DUMMY_TEMPLATE = {} as TemplateRef<unknown>;

const HEADER_IDS = ['address-persona-options-button', 'new-address-link', 'delete-address-link'];
const LOCALITY_IDS = ['zip', 'city', 'dynamicPlace', 'state', 'country'];
const SINGLE_COMMUNICATION_IDS = [
  'phonePrefix-0',
  'phoneValue-0',
  'phoneType-0',
  'add-phone-button',
  'emailValue-0',
  'emailType-0',
  'add-email-button',
];

function makeAddress(overrides: Partial<Address> = {}): Address {
  return Object.assign(new Address(), {
    id: MAIN_ADDRESS_ID,
    type: AddressTypeEnum.customer,
    street: 'Main 1',
    zip: '3000',
    city: 'Bern',
    state: 'BE',
    country: 'CH',
    validFrom: new Date(2026, 0, 15),
    ...overrides,
  });
}

function phone(index: number, value = ''): ICommunication {
  return { prefix: '+41', isPhone: true, isEmail: false, id: undefined, clientId: undefined, type: 1, value, index };
}

function email(index: number, value = ''): ICommunication {
  return { prefix: '', isPhone: false, isEmail: true, id: undefined, clientId: undefined, type: 2, value, index };
}

function makeClient(overrides: Partial<IClient> = {}): IClient {
  return {
    id: CLIENT_ID,
    idNumber: 123,
    typeAbbreviation: 'MA',
    company: '',
    title: '',
    firstName: 'Anna',
    secondName: '',
    name: 'Muster',
    maidenName: '',
    gender: GenderEnum.female,
    legalEntity: false,
    type: EntityTypeEnum.employee,
    birthdate: undefined,
    addresses: [makeAddress()],
    communications: [phone(0), email(1)],
    ...overrides,
  } as IClient;
}

function createDataService() {
  const editClient = signal<IClient | undefined>(undefined);
  const currentAddressIndex = signal(0);
  return {
    editClient,
    currentAddressIndex,
    isRead: signal(false),
    isReset: signal(false),
    editClientDeleted: signal(false),
    clientEditService: { currentAddressIndex },
    lastCountries: signal<unknown[]>([]),
    filteredStateList: signal<{ state: string; stateName?: Record<string, string> }[]>([]),
    communicationPhoneList: computed(() => editClient()?.communications.filter((c) => c.isPhone) ?? []),
    communicationEmailList: computed(() => editClient()?.communications.filter((c) => c.isEmail) ?? []),
    communicationPrefixList: signal([{ prefix: '+41', name: 'Switzerland' }]),
    communicationTypePhoneList: signal([{ type: 1, name: 'Mobile' }]),
    communicationTypeEmailList: signal([{ type: 2, name: 'Private' }]),
    clientAttribute: [] as unknown[],
    currentFilter: {
      countries: [
        { abbreviation: 'CH', name: { de: 'Schweiz', en: 'Switzerland' } },
        { abbreviation: 'DE', name: { de: 'Deutschland', en: 'Germany' } },
      ],
    },
    isCurrentAddressMainAddress: () => {
      const address = editClient()?.addresses[currentAddressIndex()];
      return !!address && address.type === AddressTypeEnum.customer;
    },
    filterState: vi.fn(),
    findClients: vi.fn(),
    refreshClientState: vi.fn(),
    addPhone: vi.fn(),
    delPhone: vi.fn(),
    addEmail: vi.fn(),
    delEmail: vi.fn(),
    removeCurrentAddress: vi.fn(),
    readClientAddressListWithoutQueryFilter: vi.fn(),
    reReadAddress: vi.fn(),
    writeCity: vi.fn(() => Promise.resolve()),
  };
}

function createModalDouble() {
  const opened: { close: () => void; dismiss: () => void }[] = [];
  const ngbModal = {
    open: vi.fn(() => {
      let close = (): void => undefined;
      let dismiss = (): void => undefined;
      const result = new Promise<void>((resolve, reject) => {
        close = () => resolve();
        dismiss = () => reject('dismissed');
      });
      opened.push({ close, dismiss });
      return { result };
    }),
  };
  return { ngbModal, opened };
}

async function settle(fixture: ComponentFixture<AddressPersonaComponent>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
}

async function setup(
  options: {
    client?: IClient;
    addressIndex?: number;
    readOnly?: boolean;
    pluginEnabled?: boolean;
    providerActive?: boolean;
    load?: boolean;
    realModal?: boolean;
  } = {},
) {
  const data = createDataService();
  const canEdit = signal(true);
  const pluginEnabled = signal(options.pluginEnabled ?? false);
  const featurePlugins = {
    ensureLoaded: vi.fn(() => Promise.resolve()),
    isPluginEnabled: vi.fn(() => pluginEnabled()),
  };
  const invitations = {
    isTelegramProviderActive: vi.fn(() => of(options.providerActive ?? true)),
    sendTelegramInvitation: vi.fn(() => of({ result: TelegramInvitationResult.Success })),
  };
  const toast = { showSuccess: vi.fn(), showError: vi.fn() };
  const modal = createModalDouble();
  const modalService = {
    resultEvent: new Subject<ModalType>(),
    componentContext: '',
    Filing: '',
    deleteMessage: '',
    deleteMessageTitle: '',
    deleteMessageOkButton: '',
    openModel: vi.fn(),
  };
  const appSettings = { loadSettingsAsync: vi.fn(() => Promise.resolve()) };
  const weekConfiguration = { isWeekend: vi.fn(() => true) };
  const cardVisibility = { setExpanded: vi.fn() };
  const geoConfig = createGeoServicesConfigMock();

  TestBed.configureTestingModule({
    imports: [AddressPersonaComponent, TranslateModule.forRoot()],
    providers: [
      { provide: DataManagementClientService, useValue: data },
      { provide: FeaturePluginStateService, useValue: featurePlugins },
      { provide: AuthorizationService, useValue: { hasPermission: () => canEdit() } },
      { provide: DataMessagingInvitationService, useValue: invitations },
      { provide: ToastShowService, useValue: toast },
      ...(options.realModal ? [] : [{ provide: NgbModal, useValue: modal.ngbModal }]),
      { provide: ModalService, useValue: modalService },
      { provide: AppSettingsManagementService, useValue: appSettings },
      { provide: WeekConfigurationService, useValue: weekConfiguration },
      { provide: EditAddressCardVisibilityService, useValue: cardVisibility },
      { provide: GeoServicesConfigService, useValue: geoConfig },
    ],
  });

  if (options.realModal) {
    TestBed.inject(NgbConfig).animation = false;
  }

  if (options.client) {
    data.currentAddressIndex.set(options.addressIndex ?? 0);
    data.editClient.set(options.client);
    data.isRead.set(options.load ?? true);
  }

  const fixture = TestBed.createComponent(AddressPersonaComponent);
  fixture.componentRef.setInput('isReadOnly', options.readOnly ?? false);
  const changes: boolean[] = [];
  fixture.componentInstance.isChangingEvent.subscribe((value) => changes.push(value));
  await settle(fixture);

  const component = fixture.componentInstance;
  const injector = fixture.debugElement.injector;
  const state = injector.get(AddressPersonaStateService);
  const parts = {
    form: state,
    actions: injector.get(AddressPersonaAddressDialogsService),
    labels: injector.get(AddressPersonaLabelsService),
    communication: injector.get(AddressPersonaCommunicationService),
    display: injector.get(AddressPersonaDisplayService),
    readBirthdate: () => state.birthdateValue(),
  };

  return {
    fixture,
    component,
    parts,
    data,
    canEdit,
    featurePlugins,
    invitations,
    toast,
    modal,
    modalService,
    appSettings,
    weekConfiguration,
    cardVisibility,
    geoConfig,
    changes,
    translate: TestBed.inject(TranslateService),
  };
}

function root(fixture: ComponentFixture<AddressPersonaComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function renderedIds(fixture: ComponentFixture<AddressPersonaComponent>): string[] {
  return Array.from(root(fixture).querySelectorAll('[id]'))
    .filter((element) => !(element instanceof SVGElement))
    .map((element) => element.id)
    .sort();
}

function byId<T extends HTMLElement = HTMLInputElement>(
  fixture: ComponentFixture<AddressPersonaComponent>,
  id: string,
): T | null {
  return root(fixture).querySelector<T>(`#${id}`);
}

function sorted(ids: string[]): string[] {
  return [...ids].sort();
}

function telegramButton(fixture: ComponentFixture<AddressPersonaComponent>): HTMLButtonElement | undefined {
  return Array.from(root(fixture).querySelectorAll('button')).find((button) =>
    button.textContent?.includes(TELEGRAM_BUTTON_KEY),
  );
}

function classesOf(fixture: ComponentFixture<AddressPersonaComponent>, id: string): { valid: boolean; invalid: boolean } {
  const element = byId(fixture, id)!;
  return { valid: element.classList.contains('is-valid'), invalid: element.classList.contains('is-invalid') };
}

function templateRef(fixture: ComponentFixture<AddressPersonaComponent>, name: string): TemplateRef<unknown> {
  const node = fixture.debugElement.queryAllNodes(() => true).find((candidate) => candidate.references[name]);
  return node!.references[name] as TemplateRef<unknown>;
}

async function settleModal(fixture: ComponentFixture<AddressPersonaComponent>): Promise<void> {
  await settle(fixture);
  await fixture.whenStable();
}

function modalElement<T extends HTMLElement = HTMLInputElement>(id: string): T | null {
  return document.body.querySelector<T>(`ngb-modal-window #${id}`);
}

function valueEvent(value: string): Event {
  return { currentTarget: { value } } as unknown as Event;
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('AddressPersonaComponent characterization', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('rendered fields', () => {
    it('renders the person fields of a main address', async () => {
      const { fixture } = await setup({ client: makeClient() });

      expect(renderedIds(fixture)).toEqual(
        sorted([
          ...HEADER_IDS,
          'gender',
          'legalEntity',
          'title',
          'firstname',
          'add-firstname2-button',
          'profile-name',
          'add-maidenname-button',
          'street',
          'add-street2-button',
          ...LOCALITY_IDS,
          ...SINGLE_COMMUNICATION_IDS,
          'profile-birthday',
        ]),
      );
    });

    it('renders company and contact person heading instead of the person-only fields for a legal entity', async () => {
      const client = makeClient({
        legalEntity: true,
        gender: GenderEnum.legalEntity,
        type: EntityTypeEnum.customer,
        company: 'ACME',
      });
      const { fixture } = await setup({ client });

      expect(renderedIds(fixture)).toEqual(
        sorted([
          ...HEADER_IDS,
          'company',
          'gender',
          'legalEntity',
          'contact-person-heading',
          'title',
          'firstname',
          'profile-name',
          'street',
          'add-street2-button',
          ...LOCALITY_IDS,
          ...SINGLE_COMMUNICATION_IDS,
        ]),
      );
    });

    it('renders the address lines instead of the name fields for a secondary address', async () => {
      const client = makeClient({
        addresses: [makeAddress(), makeAddress({ id: SECOND_ADDRESS_ID, type: AddressTypeEnum.workplace })],
      });
      const { fixture } = await setup({ client, addressIndex: 1 });

      expect(renderedIds(fixture)).toEqual(
        sorted([
          ...HEADER_IDS,
          'addressLine1',
          'addressLine2',
          'street',
          'add-street2-button',
          ...LOCALITY_IDS,
          ...SINGLE_COMMUNICATION_IDS,
        ]),
      );
    });

    it('opens the second name, maiden name and street lines when the client has values for them', async () => {
      const client = makeClient({
        secondName: 'Maria',
        maidenName: 'Meier',
        addresses: [makeAddress({ street2: 'Haus B', street3: 'Hinterhof' })],
      });
      const { fixture } = await setup({ client });

      expect(renderedIds(fixture)).toEqual(
        sorted([
          ...HEADER_IDS,
          'gender',
          'legalEntity',
          'title',
          'firstname',
          'secondName',
          'del-firstname2-button',
          'profile-name',
          'maidenName',
          'del-maidenname-button',
          'street',
          'street2',
          'del-street2-button',
          'street3',
          'del-street3-button',
          ...LOCALITY_IDS,
          ...SINGLE_COMMUNICATION_IDS,
          'profile-birthday',
        ]),
      );
      expect(byId(fixture, 'secondName')!.value).toBe('Maria');
      expect(byId(fixture, 'street3')!.value).toBe('Hinterhof');
    });

    it('hides every edit action and disables the fields when read-only, but keeps the phone delete button', async () => {
      const client = makeClient({ communications: [phone(0), phone(1), email(2)] });
      const { fixture } = await setup({ client, readOnly: true });

      expect(renderedIds(fixture)).toEqual(
        sorted([
          'gender',
          'legalEntity',
          'title',
          'firstname',
          'profile-name',
          'street',
          ...LOCALITY_IDS,
          'phonePrefix-0',
          'phoneValue-0',
          'phoneType-0',
          'phonePrefix-1',
          'phoneValue-1',
          'phoneType-1',
          'del-phone-button-1',
          'emailValue-0',
          'emailType-0',
          'profile-birthday',
        ]),
      );
      expect(byId(fixture, 'firstname')!.disabled).toBe(true);
      expect(byId(fixture, 'street')!.disabled).toBe(true);
      expect(byId(fixture, 'phoneValue-0')!.disabled).toBe(true);
      expect(byId(fixture, 'emailValue-0')!.disabled).toBe(true);
      expect(byId(fixture, 'profile-birthday')!.disabled).toBe(true);
    });

    it('disables the fields when the user lacks the edit right and enables them again when it is granted', async () => {
      const { fixture, canEdit } = await setup({ client: makeClient() });
      expect(byId(fixture, 'firstname')!.disabled).toBe(false);

      canEdit.set(false);
      await settle(fixture);

      expect(byId(fixture, 'firstname')!.disabled).toBe(true);
      expect(byId(fixture, 'phoneValue-0')!.disabled).toBe(true);
      expect(byId(fixture, 'address-persona-options-button')).toBeNull();
      expect(byId(fixture, 'add-street2-button')).toBeNull();
    });

    it('disables the fields of a deleted client', async () => {
      const { fixture, data } = await setup({ client: makeClient() });

      data.editClientDeleted.set(true);
      await settle(fixture);

      expect(byId(fixture, 'firstname')!.disabled).toBe(true);
      expect(byId(fixture, 'emailValue-0')!.disabled).toBe(true);
    });

    it('renders nothing but the header actions without a client', async () => {
      const { fixture } = await setup();

      expect(renderedIds(fixture)).toEqual(sorted(['address-persona-options-button', 'new-address-link']));
    });

    it('keeps the klacksy targets of the person fields', async () => {
      const { fixture } = await setup({ client: makeClient() });

      const targets = Array.from(root(fixture).querySelectorAll('[data-klacksy-target]'))
        .map((element) => element.getAttribute('data-klacksy-target'));
      expect(targets).toEqual([
        'client-detail.gender',
        'client-detail.firstname',
        'client-detail.lastname',
        'client-detail.birthday',
      ]);
    });

    it('shows the id number with the type abbreviation in the card header', async () => {
      const { fixture } = await setup({ client: makeClient() });

      expect(root(fixture).querySelector('.container-header')!.textContent).toContain(
        'address.edit-address.address-persona.id-number MA123',
      );
    });

    it('labels the state select with the country specific key when states exist', async () => {
      const client = makeClient();
      const { fixture, data } = await setup({ client });

      data.filteredStateList.set([{ state: 'BE' }, { state: 'ZH' }]);
      await settle(fixture);

      const label = root(fixture).querySelector<HTMLLabelElement>('label[for="state"]')!;
      expect(label.hidden).toBe(false);
      expect(label.textContent).toContain('address.all-address.all-address-persona.choose-CH');
      expect(byId(fixture, 'state')!.classList.contains('d-none')).toBe(false);
      expect(Array.from(byId<HTMLSelectElement>(fixture, 'state')!.options).map((o) => o.value)).toEqual(['BE', 'ZH']);
    });

    it('hides the state select when there are no states', async () => {
      const { fixture } = await setup({ client: makeClient() });

      expect(root(fixture).querySelector<HTMLLabelElement>('label[for="state"]')!.hidden).toBe(true);
      expect(byId(fixture, 'state')!.classList.contains('d-none')).toBe(true);
    });

    it('lists the countries with their localized name', async () => {
      const { fixture } = await setup({ client: makeClient() });

      const options = Array.from(byId<HTMLSelectElement>(fixture, 'country')!.options);
      expect(options.map((o) => o.value)).toEqual(['CH', 'DE']);
      expect(options.map((o) => o.textContent?.trim())).toEqual(['Switzerland', 'Germany']);
    });
  });

  describe('validation classes', () => {
    it('marks missing person fields of a stored client as invalid and filled ones as valid', async () => {
      const client = makeClient({ firstName: '', addresses: [makeAddress({ zip: '' })] });
      const { fixture } = await setup({ client });

      expect(classesOf(fixture, 'firstname')).toEqual({ valid: false, invalid: true });
      expect(classesOf(fixture, 'profile-name')).toEqual({ valid: true, invalid: false });
      expect(classesOf(fixture, 'gender')).toEqual({ valid: true, invalid: false });
      expect(classesOf(fixture, 'zip')).toEqual({ valid: false, invalid: true });
      expect(classesOf(fixture, 'city')).toEqual({ valid: true, invalid: false });
      expect(classesOf(fixture, 'country')).toEqual({ valid: true, invalid: false });
    });

    it('does not mark missing fields of a new, untouched client as invalid', async () => {
      const client = makeClient({ id: undefined, firstName: '', addresses: [makeAddress({ zip: '' })] });
      const { fixture } = await setup({ client });

      expect(classesOf(fixture, 'firstname')).toEqual({ valid: false, invalid: false });
      expect(classesOf(fixture, 'zip')).toEqual({ valid: false, invalid: false });
      expect(classesOf(fixture, 'profile-name')).toEqual({ valid: true, invalid: false });
    });

    it('validates the company instead of the person fields for a legal entity', async () => {
      const client = makeClient({
        legalEntity: true,
        gender: GenderEnum.legalEntity,
        type: EntityTypeEnum.customer,
        company: '',
        firstName: '',
      });
      const { fixture } = await setup({ client });

      expect(classesOf(fixture, 'company')).toEqual({ valid: false, invalid: true });
      expect(classesOf(fixture, 'firstname')).toEqual({ valid: false, invalid: false });
      expect(classesOf(fixture, 'gender')).toEqual({ valid: false, invalid: false });
      expect(classesOf(fixture, 'zip')).toEqual({ valid: true, invalid: false });
    });

    it('re-validates after the user clears a required field', async () => {
      const { fixture } = await setup({ client: makeClient() });

      typeInto(byId(fixture, 'profile-name')!, '');
      await settle(fixture);

      expect(classesOf(fixture, 'profile-name')).toEqual({ valid: false, invalid: true });
    });
  });

  describe('form effects', () => {
    it('loads the client into the form without reporting a change', async () => {
      const client = makeClient({ birthdate: new Date(1990, 4, 17) });
      const { fixture, parts, data, changes } = await setup({ client, load: false });
      data.filterState.mockClear();

      data.isRead.set(true);
      await settle(fixture);

      expect(parts.form.formModel()).toEqual(
        expect.objectContaining({ firstName: 'Anna', name: 'Muster', street: 'Main 1', zip: '3000', country: 'CH' }),
      );
      expect(byId(fixture, 'firstname')!.value).toBe('Anna');
      expect(byId(fixture, 'street')!.value).toBe('Main 1');
      expect(parts.readBirthdate()).toEqual(transformDateToNgbDateStruct(client.birthdate));
      expect(data.filterState).toHaveBeenCalledTimes(1);
      expect(data.findClients).not.toHaveBeenCalled();
      expect(changes).toEqual([]);
    });

    it('reports a reset as "not changing" after a microtask', async () => {
      const { fixture, data, changes } = await setup({ client: makeClient(), load: false });

      data.isReset.set(true);
      fixture.detectChanges();
      expect(changes).toEqual([]);

      await Promise.resolve();
      expect(changes).toEqual([false]);
    });

    it('syncs a typed value into the client and reports the change after a microtask', async () => {
      const client = makeClient();
      const { fixture, changes } = await setup({ client });

      typeInto(byId(fixture, 'firstname')!, 'Berta');
      fixture.detectChanges();
      expect(client.firstName).toBe('Berta');
      expect(changes).toEqual([]);

      await Promise.resolve();
      expect(changes).toEqual([true]);
    });

    it('syncs a programmatic form update into the client without reporting a change', async () => {
      const client = makeClient();
      const { fixture, parts, changes } = await setup({ client });

      parts.form.formModel.update((model) => ({ ...model, name: 'Neu', city: 'Thun' }));
      await settle(fixture);

      expect(client.name).toBe('Neu');
      expect(client.addresses[0].city).toBe('Thun');
      expect(changes).toEqual([]);
    });

    it('filters the states once when the country changes', async () => {
      const client = makeClient();
      const { fixture, parts, data } = await setup({ client });
      data.filterState.mockClear();

      parts.form.formModel.update((model) => ({ ...model, country: 'DE' }));
      await settle(fixture);
      parts.form.formModel.update((model) => ({ ...model, city: 'Berlin' }));
      await settle(fixture);

      expect(client.addresses[0].country).toBe('DE');
      expect(data.filterState).toHaveBeenCalledTimes(1);
    });

    it('searches for duplicates of a new client after a microtask on every sync', async () => {
      const { fixture, parts, data } = await setup({ client: makeClient({ id: undefined }) });
      data.findClients.mockClear();

      parts.form.formModel.update((model) => ({ ...model, name: 'Neu' }));
      fixture.detectChanges();
      expect(data.findClients).not.toHaveBeenCalled();

      await Promise.resolve();
      expect(data.findClients).toHaveBeenCalledTimes(1);
    });

    it('reloads the address fields when the current address changes', async () => {
      const client = makeClient({
        addresses: [
          makeAddress(),
          makeAddress({
            id: SECOND_ADDRESS_ID,
            type: AddressTypeEnum.workplace,
            street: 'Werkweg 2',
            street2: 'Halle 3',
            zip: '8000',
            city: 'Zürich',
          }),
        ],
      });
      const { fixture, parts, data, changes } = await setup({ client });
      data.filterState.mockClear();

      data.currentAddressIndex.set(1);
      await settle(fixture);

      expect(parts.form.formModel()).toEqual(
        expect.objectContaining({ firstName: 'Anna', street: 'Werkweg 2', street2: 'Halle 3', zip: '8000' }),
      );
      expect(byId(fixture, 'street')!.value).toBe('Werkweg 2');
      expect(byId(fixture, 'street2')!.value).toBe('Halle 3');
      expect(byId(fixture, 'addressLine1')).not.toBeNull();
      expect(byId(fixture, 'firstname')).toBeNull();
      expect(data.filterState).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([]);
    });

    it('switches gender and client type when the legal entity flag is toggled', async () => {
      const client = makeClient();
      const { fixture, parts } = await setup({ client });

      parts.form.formModel.update((model) => ({ ...model, legalEntity: true }));
      await settle(fixture);

      expect(parts.form.formModel().gender).toBe(String(GenderEnum.legalEntity));
      expect(client.type).toBe(EntityTypeEnum.customer);
      expect(client.legalEntity).toBe(true);
      expect(client.gender).toBe(GenderEnum.legalEntity);
      expect(parts.form.isLegalEntity()).toBe(true);
      expect(byId(fixture, 'company')).not.toBeNull();
      expect(byId(fixture, 'contact-person-heading')).not.toBeNull();
      expect(byId(fixture, 'profile-birthday')).toBeNull();
      expect(byId(fixture, 'add-firstname2-button')).toBeNull();

      parts.form.formModel.update((model) => ({ ...model, legalEntity: false }));
      await settle(fixture);

      expect(parts.form.formModel().gender).toBe(String(GenderEnum.female));
      expect(client.type).toBe(0);
      expect(byId(fixture, 'company')).toBeNull();
      expect(byId(fixture, 'profile-birthday')).not.toBeNull();
    });

    it('refreshes the optional lines, validation and birthdate when another client is loaded', async () => {
      const { fixture, data } = await setup({ client: makeClient() });
      expect(byId(fixture, 'secondName')).toBeNull();
      expect(classesOf(fixture, 'zip')).toEqual({ valid: true, invalid: false });

      data.editClient.set(
        makeClient({
          id: 'client-2',
          firstName: '',
          secondName: 'Maria',
          birthdate: new Date(1990, 4, 17),
          addresses: [makeAddress({ street2: 'Haus B', zip: '' })],
        }),
      );
      await settle(fixture);

      expect(byId(fixture, 'secondName')!.value).toBe('Maria');
      expect(byId(fixture, 'street2')!.value).toBe('Haus B');
      expect(classesOf(fixture, 'firstname')).toEqual({ valid: false, invalid: true });
      expect(classesOf(fixture, 'zip')).toEqual({ valid: false, invalid: true });
      expect(byId(fixture, 'profile-birthday')!.value).toBe('1990-05-17');
    });

    it('keeps opened optional lines open when the next client has no value for them', async () => {
      const { fixture, data } = await setup({
        client: makeClient({ secondName: 'Maria', addresses: [makeAddress({ street2: 'Haus B' })] }),
      });

      data.editClient.set(makeClient({ id: 'client-2' }));
      await settle(fixture);

      expect(byId(fixture, 'secondName')!.value).toBe('');
      expect(byId(fixture, 'street2')!.value).toBe('');
    });

    it('stores a picked birthdate on the client', async () => {
      const client = makeClient();
      const { parts } = await setup({ client });
      const picked = { year: 1985, month: 3, day: 9 };

      parts.form.onBirthdateChange(picked);
      expect(parts.readBirthdate()).toBe(picked);
      expect(client.birthdate).toEqual(transformNgbDateStructToDate(picked));

      parts.form.onBirthdateChange(undefined);
      expect(client.birthdate).toBeUndefined();
    });

    it('shows and hides the optional lines through their buttons', async () => {
      const { fixture } = await setup({ client: makeClient() });

      byId(fixture, 'add-street2-button')!.click();
      await settle(fixture);
      expect(byId(fixture, 'street2')).not.toBeNull();
      expect(byId(fixture, 'add-street3-button')).not.toBeNull();

      byId(fixture, 'add-street3-button')!.click();
      await settle(fixture);
      expect(byId(fixture, 'street3')).not.toBeNull();

      byId(fixture, 'del-street2-button')!.click();
      await settle(fixture);
      expect(byId(fixture, 'street2')).toBeNull();
      expect(byId(fixture, 'street3')).not.toBeNull();

      byId(fixture, 'add-firstname2-button')!.click();
      byId(fixture, 'add-maidenname-button')!.click();
      await settle(fixture);
      expect(byId(fixture, 'secondName')).not.toBeNull();
      expect(byId(fixture, 'maidenName')).not.toBeNull();

      byId(fixture, 'del-firstname2-button')!.click();
      await settle(fixture);
      expect(byId(fixture, 'secondName')).toBeNull();
    });
  });

  describe('zip lookup', () => {
    it('copies the looked up city into the form and re-validates', async () => {
      const client = makeClient({ addresses: [makeAddress({ city: '' })] });
      const { fixture, parts, data } = await setup({ client });
      expect(classesOf(fixture, 'city')).toEqual({ valid: false, invalid: true });
      data.writeCity.mockImplementation(async () => {
        client.addresses[0].city = 'Zürich';
      });

      byId(fixture, 'zip')!.dispatchEvent(new Event('focusout'));
      await settle(fixture);

      expect(data.writeCity).toHaveBeenCalledTimes(1);
      expect(parts.form.formModel().city).toBe('Zürich');
      expect(byId(fixture, 'city')!.value).toBe('Zürich');
      expect(classesOf(fixture, 'city')).toEqual({ valid: true, invalid: false });
    });

    it('keeps the typed address when the zip has no city', async () => {
      const client = makeClient();
      const { fixture, parts, data } = await setup({ client });
      data.writeCity.mockImplementation(() => Promise.reject(new Error('no city')));

      byId(fixture, 'zip')!.dispatchEvent(new Event('focusout'));
      await settle(fixture);

      expect(parts.form.formModel().city).toBe('Bern');
      expect(byId(fixture, 'city')!.value).toBe('Bern');
    });
  });

  describe('address actions', () => {
    it('adds a new address of the current type when the new address dialog is confirmed', async () => {
      const client = makeClient();
      const { fixture, parts, data, modal, changes } = await setup({ client });

      byId(fixture, 'new-address-link')!.click();
      expect(modal.ngbModal.open).toHaveBeenCalledWith(expect.any(TemplateRef), MD_MODAL_OPTIONS);
      expect(parts.actions.newAddressType).toBe(AddressTypeEnum.customer);

      modal.opened[0].close();
      await settle(fixture);

      expect(client.addresses).toHaveLength(2);
      expect(client.addresses[1].type).toBe(AddressTypeEnum.customer);
      expect((client.addresses[1] as Address).isScoped).toBe(true);
      expect(client.addresses[1].validFrom).toEqual(transformNgbDateStructToDate(parts.actions.newAddressValidFrom));
      expect(data.currentAddressIndex()).toBe(1);
      expect(changes).toEqual([true]);
    });

    it('adds nothing when the new address dialog is dismissed', async () => {
      const client = makeClient();
      const { fixture, modal, changes } = await setup({ client });

      byId(fixture, 'new-address-link')!.click();
      modal.opened[0].dismiss();
      await settle(fixture);

      expect(client.addresses).toHaveLength(1);
      expect(changes).toEqual([]);
    });

    it('falls back to the main address type when the current type is not allowed for the client type', async () => {
      const client = makeClient({
        addresses: [makeAddress(), makeAddress({ id: SECOND_ADDRESS_ID, type: AddressTypeEnum.workplace })],
      });
      const { parts } = await setup({ client, addressIndex: 1 });

      parts.actions.openNewAddress(DUMMY_TEMPLATE);

      expect(parts.actions.newAddressType).toBe(AddressTypeEnum.customer);
    });

    it('applies the client and address type of the address type dialog', async () => {
      const client = makeClient({ type: EntityTypeEnum.customer });
      const { fixture, parts, data, modal, changes } = await setup({ client });

      parts.actions.openAddressType(DUMMY_TEMPLATE);
      expect(modal.ngbModal.open).toHaveBeenCalledWith(DUMMY_TEMPLATE, MD_MODAL_OPTIONS);
      expect(parts.actions.editClientType).toBe(EntityTypeEnum.customer);
      expect(parts.actions.addressType).toBe(AddressTypeEnum.customer);
      expect(parts.actions.addressValidFrom).toEqual(transformDateToNgbDateStruct(client.addresses[0].validFrom));

      parts.actions.editClientType = EntityTypeEnum.externEmp;
      parts.actions.addressType = AddressTypeEnum.workplace;
      parts.actions.addressValidFrom = { year: 2026, month: 2, day: 1 };
      modal.opened[0].close();
      await settle(fixture);

      expect(client.type).toBe(EntityTypeEnum.externEmp);
      expect(client.addresses[0].type).toBe(AddressTypeEnum.workplace);
      expect(client.addresses[0].validFrom).toEqual(transformNgbDateStructToDate({ year: 2026, month: 2, day: 1 }));
      expect(data.refreshClientState).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([true]);
    });

    it('refuses a client type that does not allow the existing address types', async () => {
      const client = makeClient({
        type: EntityTypeEnum.customer,
        addresses: [makeAddress(), makeAddress({ id: SECOND_ADDRESS_ID, type: AddressTypeEnum.invoicingAddress })],
      });
      const { fixture, parts, data, modal, toast, changes } = await setup({ client });

      parts.actions.openAddressType(DUMMY_TEMPLATE);
      parts.actions.editClientType = EntityTypeEnum.employee;
      modal.opened[0].close();
      await settle(fixture);

      expect(toast.showError).toHaveBeenCalledWith(ADDRESS_TYPE_NOT_ALLOWED_KEY);
      expect(client.type).toBe(EntityTypeEnum.customer);
      expect(data.refreshClientState).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([true]);
    });

    it('names the address types', async () => {
      const { parts } = await setup({ client: makeClient() });

      expect([0, 1, 2, 3].map((type) => parts.actions.onAddressTypeName(type))).toEqual([
        DomainMessages.ADDRES_TYPE0_NAME,
        DomainMessages.ADDRES_TYPE1_NAME,
        DomainMessages.ADDRES_TYPE2_NAME,
        '',
      ]);
    });

    it('allows the address types of the client type', async () => {
      const { parts, data } = await setup({ client: makeClient({ type: EntityTypeEnum.externEmp }) });

      expect(parts.actions.allowedAddressTypes).toEqual([AddressTypeEnum.customer, AddressTypeEnum.workplace]);
      data.editClient.set(undefined);
      expect(parts.actions.allowedAddressTypes).toEqual([]);
    });

    it('asks for confirmation before deactivating the current address', async () => {
      const { fixture, modalService } = await setup({ client: makeClient() });
      modalService.Filing = 'stale';

      byId(fixture, 'delete-address-link')!.click();

      expect(modalService.Filing).toBe('');
      expect(modalService.componentContext).toBe('address-persona');
      expect(modalService.deleteMessage).toBe(DomainMessages.DEACTIVE_ADDRESS);
      expect(modalService.deleteMessageTitle).toBe(DomainMessages.DEACTIVE_ADDRESS_TITLE);
      expect(modalService.deleteMessageOkButton).toBe(DomainMessages.DEACTIVE_ADDRESS_TITLE);
      expect(modalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('removes the current address when its own delete confirmation arrives', async () => {
      const { data, modalService, changes } = await setup({ client: makeClient() });
      modalService.componentContext = 'address-persona';
      modalService.Filing = 'x';

      modalService.resultEvent.next(ModalType.Delete);

      expect(data.removeCurrentAddress).toHaveBeenCalledTimes(1);
      expect(modalService.componentContext).toBe('');
      expect(modalService.Filing).toBe('');
      expect(changes).toEqual([true]);
    });

    it('ignores delete confirmations of other components and other modal results', async () => {
      const { data, modalService, changes } = await setup({ client: makeClient() });

      modalService.componentContext = 'all-address-list';
      modalService.resultEvent.next(ModalType.Delete);
      modalService.componentContext = 'address-persona';
      modalService.resultEvent.next(ModalType.Confirmation);

      expect(data.removeCurrentAddress).not.toHaveBeenCalled();
      expect(modalService.componentContext).toBe('address-persona');
      expect(changes).toEqual([]);
    });

    it('stops listening to modal results after destroy', async () => {
      const { fixture, data, modalService } = await setup({ client: makeClient() });
      modalService.componentContext = 'address-persona';

      fixture.destroy();
      modalService.resultEvent.next(ModalType.Delete);

      expect(data.removeCurrentAddress).not.toHaveBeenCalled();
    });

    it('reads the full address list before opening the address list dialog', async () => {
      const { parts, data, modal } = await setup({ client: makeClient() });

      parts.actions.openAddressList(DUMMY_TEMPLATE);

      expect(data.readClientAddressListWithoutQueryFilter).toHaveBeenCalledTimes(1);
      expect(modal.ngbModal.open).toHaveBeenCalledWith(DUMMY_TEMPLATE, LG_MODAL_OPTIONS);
    });

    it('re-reads the address when a known address is chosen', async () => {
      const { parts, data, changes } = await setup({ client: makeClient() });

      parts.actions.onChangingAddress(MAIN_ADDRESS_ID);

      expect(data.reReadAddress).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([true]);
    });
  });

  describe('address dialogs', () => {
    afterEach(() => {
      TestBed.inject(NgbModal).dismissAll();
    });

    it('renders the new address dialog and adds the chosen address type on save', async () => {
      const client = makeClient({ type: EntityTypeEnum.customer });
      const { fixture, parts, data, changes } = await setup({ client, realModal: true });

      byId(fixture, 'new-address-link')!.click();
      await settleModal(fixture);

      expect(modalElement('newAddressValidFrom')).not.toBeNull();
      const typeSelect = modalElement<HTMLSelectElement>('newAddressType')!;
      expect(Array.from(typeSelect.options).map((o) => o.textContent?.trim())).toEqual([
        DomainMessages.ADDRES_TYPE0_NAME,
        DomainMessages.ADDRES_TYPE1_NAME,
        DomainMessages.ADDRES_TYPE2_NAME,
      ]);

      typeSelect.selectedIndex = 2;
      typeSelect.dispatchEvent(new Event('change'));
      await settleModal(fixture);
      expect(parts.actions.newAddressType).toBe(AddressTypeEnum.invoicingAddress);

      modalElement<HTMLButtonElement>('modal-save-new-address')!.click();
      await settleModal(fixture);

      expect(client.addresses).toHaveLength(2);
      expect(client.addresses[1].type).toBe(AddressTypeEnum.invoicingAddress);
      expect(data.currentAddressIndex()).toBe(1);
      expect(changes).toEqual([true]);
      expect(modalElement('newAddressValidFrom')).toBeNull();
    });

    it('hides the type choice of the new address dialog when only one type is allowed', async () => {
      const { fixture } = await setup({ client: makeClient(), realModal: true });

      byId(fixture, 'new-address-link')!.click();
      await settleModal(fixture);

      expect(modalElement('newAddressValidFrom')).not.toBeNull();
      expect(modalElement('newAddressType')).toBeNull();
    });

    it('adds nothing when the new address dialog is cancelled', async () => {
      const client = makeClient();
      const { fixture, changes } = await setup({ client, realModal: true });

      byId(fixture, 'new-address-link')!.click();
      await settleModal(fixture);
      modalElement<HTMLElement>('modal-cancel-new-address')!.click();
      await settleModal(fixture);

      expect(client.addresses).toHaveLength(1);
      expect(changes).toEqual([]);
      expect(modalElement('newAddressValidFrom')).toBeNull();
    });

    it('renders the address type dialog with the client types and applies it on save', async () => {
      const client = makeClient({ type: EntityTypeEnum.customer });
      const { fixture, parts, data, changes } = await setup({ client, realModal: true });
      data.clientAttribute = [
        { type: EntityTypeEnum.employee, name: 'Employee' },
        { type: EntityTypeEnum.customer, name: 'Customer' },
      ];

      parts.actions.openAddressType(templateRef(fixture, 'addressTypeModal'));
      await settleModal(fixture);

      expect(modalElement('addressValidFrom')).not.toBeNull();
      const typeSelect = modalElement<HTMLSelectElement>('editClientType')!;
      expect(Array.from(typeSelect.options).map((o) => o.textContent?.trim())).toEqual(['Employee', 'Customer']);

      modalElement<HTMLButtonElement>('modal-save-address-type')!.click();
      await settleModal(fixture);

      expect(data.refreshClientState).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([true]);
      expect(modalElement('addressValidFrom')).toBeNull();
    });

    it('swaps the name fields for the address lines when the address type dialog makes the address secondary', async () => {
      const client = makeClient({ type: EntityTypeEnum.customer });
      const { fixture, parts, data } = await setup({ client, realModal: true });
      data.refreshClientState.mockImplementation(() => data.editClient.set({ ...data.editClient()! }));
      expect(byId(fixture, 'firstname')).not.toBeNull();

      parts.actions.openAddressType(templateRef(fixture, 'addressTypeModal'));
      await settleModal(fixture);
      parts.actions.addressType = AddressTypeEnum.workplace;
      modalElement<HTMLButtonElement>('modal-save-address-type')!.click();
      await settleModal(fixture);

      expect(data.editClient()!.addresses[0].type).toBe(AddressTypeEnum.workplace);
      expect(byId(fixture, 'firstname')).toBeNull();
      expect(byId(fixture, 'addressLine1')).not.toBeNull();
    });

    it('applies nothing when the address type dialog is cancelled', async () => {
      const { fixture, parts, data, changes } = await setup({ client: makeClient(), realModal: true });

      parts.actions.openAddressType(templateRef(fixture, 'addressTypeModal'));
      await settleModal(fixture);
      expect(modalElement('editClientType')).toBeNull();
      modalElement<HTMLElement>('modal-cancel-address-type')!.click();
      await settleModal(fixture);

      expect(data.refreshClientState).not.toHaveBeenCalled();
      expect(changes).toEqual([]);
    });
  });

  describe('communications', () => {
    it('adds phones and emails without reporting a change', async () => {
      const { fixture, data, changes } = await setup({ client: makeClient() });

      byId(fixture, 'add-phone-button')!.click();
      byId(fixture, 'add-email-button')!.click();

      expect(data.addPhone).toHaveBeenCalledTimes(1);
      expect(data.addEmail).toHaveBeenCalledTimes(1);
      expect(changes).toEqual([]);
    });

    it('deletes phones and emails and reports the change', async () => {
      const client = makeClient({ communications: [phone(0), phone(1), email(2), email(3)] });
      const { fixture, data, changes } = await setup({ client });

      byId(fixture, 'del-phone-button-1')!.click();
      byId(fixture, 'del-email-button-1')!.click();

      expect(data.delPhone).toHaveBeenCalledWith(1);
      expect(data.delEmail).toHaveBeenCalledWith(3);
      expect(changes).toEqual([true, true]);
    });

    it('formats a typed phone number in place', async () => {
      const client = makeClient();
      const { fixture } = await setup({ client });
      const input = byId(fixture, 'phoneValue-0')!;

      input.value = RAW_PHONE;
      input.dispatchEvent(new KeyboardEvent('keyup'));

      expect(input.value).toBe(formatPhoneNumber(RAW_PHONE));
      expect(client.communications[0].value).toBe(formatPhoneNumber(RAW_PHONE));
    });

    it('writes changed communication fields and reports the change', async () => {
      const client = makeClient();
      const { parts, changes } = await setup({ client });

      parts.communication.onChangePhoneType(0, valueEvent('3'));
      parts.communication.onChangePhonePrefix(0, valueEvent('+49'));
      parts.communication.onChangePhoneValue(0, valueEvent('044'));
      parts.communication.onChangeEmailValue(0, valueEvent('a@b.ch'));
      parts.communication.onChangeEmailType(0, valueEvent('4'));

      expect(client.communications[0]).toEqual(expect.objectContaining({ type: 3, prefix: '+49', value: '044' }));
      expect(client.communications[1]).toEqual(expect.objectContaining({ type: 4, value: 'a@b.ch' }));
      expect(changes).toEqual([true, true, true, true, true]);
    });

    it('ignores empty communication values and sealed phone values', async () => {
      const client = makeClient();
      const { parts, changes } = await setup({ client });

      parts.communication.onChangePhonePrefix(0, valueEvent(''));
      parts.communication.isPhoneValueSeals = true;
      parts.communication.onChangePhoneValue(0, valueEvent('044'));

      expect(client.communications[0].prefix).toBe('+41');
      expect(client.communications[0].value).toBe('');
      expect(changes).toEqual([]);
    });
  });

  describe('labels and display', () => {
    it('loads the settings and the geo configuration on init', async () => {
      const { appSettings, geoConfig } = await setup({ client: makeClient() });

      expect(appSettings.loadSettingsAsync).toHaveBeenCalledTimes(1);
      expect(geoConfig.ensureLoaded).toHaveBeenCalledTimes(1);
    });

    it('reports the expanded persona card', async () => {
      const { cardVisibility } = await setup({ client: makeClient() });

      expect(cardVisibility.setExpanded).toHaveBeenCalledWith(EDIT_ADDRESS_CARD_KEYS.Persona, true);
    });

    it('follows a language change and resets the deactivation texts after a microtask', async () => {
      const { parts, translate } = await setup({ client: makeClient() });
      parts.labels.message = 'stale';
      parts.labels.title = 'stale';
      parts.labels.newAddressString = 'stale';

      translate.use('de');
      expect(parts.labels.currentLang).toBe('de');
      expect(parts.labels.message).toBe('stale');

      await Promise.resolve();
      expect(parts.labels.message).toBe(DomainMessages.DEACTIVE_ADDRESS);
      expect(parts.labels.title).toBe(DomainMessages.DEACTIVE_ADDRESS_TITLE);
      expect(parts.labels.newAddressString).toBe(DomainMessages.NEW_ADDRESS);
    });

    it('shows the country names in the new language', async () => {
      const { fixture, translate } = await setup({ client: makeClient() });

      translate.use('de');
      await settle(fixture);

      const options = Array.from(byId<HTMLSelectElement>(fixture, 'country')!.options);
      expect(options.map((o) => o.textContent?.trim())).toEqual(['Schweiz', 'Deutschland']);
    });

    it('names the current state in the language of the user', async () => {
      const { parts, data, translate } = await setup({ client: makeClient() });
      translate.use('en');

      data.filteredStateList.set([{ state: 'BE', stateName: { en: 'Canton of Bern' } }]);
      expect(parts.display.getCurrentStateName()).toBe('Canton of Bern');

      data.filteredStateList.set([{ state: 'ZH', stateName: { en: 'Canton of Zurich' } }]);
      expect(parts.display.getCurrentStateName()).toBe('');
    });

    it('falls back to the generic state label without a client', async () => {
      const { parts } = await setup();

      expect(parts.display.choseCorrectState()).toBe('address.edit-address.address-persona.state');
      expect(parts.display.getCurrentStateName()).toBe('');
    });

    it('asks the week configuration whether a date is a weekend day', async () => {
      const { parts, weekConfiguration } = await setup({ client: makeClient() });

      expect(parts.display.isWeekend({ year: 2026, month: 10, day: 24 })).toBe(true);
      expect(weekConfiguration.isWeekend).toHaveBeenCalledWith(new Date(2026, 9, 24));
    });
  });

  describe('telegram invitation', () => {
    it('offers the invitation for a stored employee when the messaging plugin and provider are active', async () => {
      const { fixture, featurePlugins, invitations } = await setup({ client: makeClient(), pluginEnabled: true });

      expect(featurePlugins.ensureLoaded).toHaveBeenCalledTimes(1);
      expect(invitations.isTelegramProviderActive).toHaveBeenCalledTimes(1);
      expect(telegramButton(fixture)).toBeDefined();
    });

    it('does not ask for the provider when the messaging plugin is off', async () => {
      const { fixture, invitations } = await setup({ client: makeClient(), pluginEnabled: false });

      expect(invitations.isTelegramProviderActive).not.toHaveBeenCalled();
      expect(telegramButton(fixture)).toBeUndefined();
    });

    it('hides the invitation when the provider is inactive, for customers, new clients and read-only', async () => {
      const inactive = await setup({ client: makeClient(), pluginEnabled: true, providerActive: false });
      expect(telegramButton(inactive.fixture)).toBeUndefined();
      TestBed.resetTestingModule();

      const customer = await setup({ client: makeClient({ type: EntityTypeEnum.customer }), pluginEnabled: true });
      expect(telegramButton(customer.fixture)).toBeUndefined();
      TestBed.resetTestingModule();

      const unsaved = await setup({ client: makeClient({ id: undefined }), pluginEnabled: true });
      expect(telegramButton(unsaved.fixture)).toBeUndefined();
      TestBed.resetTestingModule();

      const readOnly = await setup({ client: makeClient(), pluginEnabled: true, readOnly: true });
      expect(telegramButton(readOnly.fixture)).toBeUndefined();
    });

    it('confirms a sent invitation', async () => {
      const { fixture, invitations, toast } = await setup({ client: makeClient(), pluginEnabled: true });

      telegramButton(fixture)!.click();

      expect(invitations.sendTelegramInvitation).toHaveBeenCalledWith(CLIENT_ID);
      expect(toast.showSuccess).toHaveBeenCalledWith('messaging.sendTelegramInvitation.success', '');
      expect(toast.showError).not.toHaveBeenCalled();
    });

    it('reports an invitation that was not sent with the key of its result', async () => {
      const { fixture, invitations, toast } = await setup({ client: makeClient(), pluginEnabled: true });
      const results: [string | undefined, string][] = [
        [TelegramInvitationResult.AlreadyLinked, 'messaging.sendTelegramInvitation.alreadyLinked'],
        [TelegramInvitationResult.NoContactChannel, 'messaging.sendTelegramInvitation.noContactChannel'],
        [TelegramInvitationResult.SendFailed, 'messaging.sendTelegramInvitation.sendFailed'],
        [TelegramInvitationResult.NotEmployee, 'messaging.sendTelegramInvitation.notEmployee'],
        [TelegramInvitationResult.NoTelegramProvider, 'messaging.sendTelegramInvitation.noProvider'],
        ['Unexpected', 'messaging.sendTelegramInvitation.error'],
      ];

      for (const [result, key] of results) {
        invitations.sendTelegramInvitation.mockReturnValueOnce(of({ result: result as string }) as never);
        telegramButton(fixture)!.click();
        expect(toast.showError).toHaveBeenLastCalledWith(key);
      }
      expect(toast.showSuccess).not.toHaveBeenCalled();
    });

    it('reports a failed request with the key of the result in the error body', async () => {
      const { fixture, invitations, toast } = await setup({ client: makeClient(), pluginEnabled: true });

      invitations.sendTelegramInvitation.mockReturnValueOnce(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { result: TelegramInvitationResult.NoTelegramProvider } }),
        ) as never,
      );
      telegramButton(fixture)!.click();
      expect(toast.showError).toHaveBeenLastCalledWith('messaging.sendTelegramInvitation.noProvider');

      invitations.sendTelegramInvitation.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 500 })) as never,
      );
      telegramButton(fixture)!.click();
      expect(toast.showError).toHaveBeenLastCalledWith('messaging.sendTelegramInvitation.error');
    });
  });
});
