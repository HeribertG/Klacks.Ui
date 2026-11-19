// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { IdentityProviderRowComponent } from './identity-provider-row.component';
import { DataManagementIdentityProviderService } from 'src/app/domain/services/settings/data-management-identity-provider.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { IdentityProvider } from 'src/app/domain/models/settings/identity-provider-class';
import { IIdentityProviderListItem } from 'src/app/domain/interfaces/identity-provider-list-item.interface';
import { IdentityProviderType } from 'src/app/domain/enums/identity-provider-enum';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import {
  AD_REQUIRES_SSL_WARNING_KEY,
  DEFAULT_USER_FILTER,
  LDAP_DEFAULT_PORT,
  LDAP_UNENCRYPTED_WARNING_KEY,
} from 'src/app/domain/constants/identity-provider.constants';

const LEGACY_AD_FILTER = '(&(objectClass=user)(objectCategory=person))';

function listItem(overrides: Partial<IIdentityProviderListItem> = {}): IIdentityProviderListItem {
  return {
    id: 'provider-1',
    name: 'Directory',
    type: IdentityProviderType.Ldap,
    isEnabled: true,
    sortOrder: 0,
    useForAuthentication: true,
    useForClientImport: false,
    ...overrides,
  };
}

function editable(type: IdentityProviderType, userFilter?: string, id = 'provider-1'): IdentityProvider {
  const p = new IdentityProvider();
  p.id = id;
  p.type = type;
  p.userFilter = userFilter;
  return p;
}

describe('IdentityProviderRowComponent', () => {
  let fixture: ComponentFixture<IdentityProviderRowComponent>;
  let component: IdentityProviderRowComponent;
  let modal: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    modal = { open: vi.fn().mockReturnValue({ result: new Promise(() => undefined) }) };

    await TestBed.configureTestingModule({
      imports: [IdentityProviderRowComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NgbModal, useValue: modal },
        { provide: ManualLoaderService, useValue: { loadManual: vi.fn().mockReturnValue(of('')) } },
        {
          provide: DataManagementIdentityProviderService,
          useValue: {
            isTesting: signal(false),
            isSyncing: signal(false),
            loadProvider: vi.fn().mockResolvedValue(null),
            saveProvider: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IdentityProviderRowComponent);
    component = fixture.componentInstance;
  });

  function setUp(item: IIdentityProviderListItem, provider: IdentityProvider | null): void {
    fixture.componentRef.setInput('data', item);
    component.editProvider.set(provider);
    fixture.detectChanges();
  }

  it('switches a legacy AD filter to the LDAP default when the type changes to LDAP', () => {
    const provider = editable(IdentityProviderType.Ldap, LEGACY_AD_FILTER);
    setUp(listItem(), provider);

    component.onTypeChange();

    expect(provider.userFilter).toBe(DEFAULT_USER_FILTER[IdentityProviderType.Ldap]);
  });

  it('keeps a custom filter when the type changes', () => {
    const provider = editable(IdentityProviderType.ActiveDirectory, '(objectClass=inetOrgPerson)');
    setUp(listItem(), provider);

    component.onTypeChange();

    expect(provider.userFilter).toBe('(objectClass=inetOrgPerson)');
  });

  it('prefills a new provider with the LDAP filter and port', async () => {
    setUp(listItem({ id: '', isDirty: CreateEntriesEnum.new, useForAuthentication: false }), null);

    component.openModal();
    await fixture.whenStable();

    const provider = component.editProvider() as IdentityProvider;
    expect(provider.userFilter).toBe(DEFAULT_USER_FILTER[IdentityProviderType.Ldap]);
    expect(provider.port).toBe(LDAP_DEFAULT_PORT);
    expect(provider.useForClientImport).toBe(false);
  });

  it('offers the approval tab only for a saved directory provider used for sign-in', () => {
    setUp(listItem(), editable(IdentityProviderType.Ldap));
    expect(component.hasAccountsTab()).toBe(true);

    setUp(listItem({ useForAuthentication: false }), editable(IdentityProviderType.Ldap));
    expect(component.hasAccountsTab()).toBe(false);

    setUp(listItem(), editable(IdentityProviderType.Ldap, undefined, ''));
    expect(component.hasAccountsTab()).toBe(false);

    setUp(listItem({ type: IdentityProviderType.OAuth2 }), editable(IdentityProviderType.OAuth2));
    expect(component.hasAccountsTab()).toBe(false);
  });

  it('keeps the approval tab closed for a saved Active Directory provider without SSL', () => {
    setUp(listItem({ type: IdentityProviderType.ActiveDirectory }), editable(IdentityProviderType.ActiveDirectory));
    component.persistedUseSsl.set(false);
    expect(component.hasAccountsTab()).toBe(false);

    component.persistedUseSsl.set(true);
    expect(component.hasAccountsTab()).toBe(true);
  });

  it('judges the approval tab by the saved SSL setting, not by the unsaved form', () => {
    const provider = editable(IdentityProviderType.ActiveDirectory);
    provider.useSsl = true;
    setUp(listItem({ type: IdentityProviderType.ActiveDirectory }), provider);
    component.persistedUseSsl.set(false);

    expect(component.hasAccountsTab()).toBe(false);
  });

  it('takes the saved SSL setting from the loaded provider', async () => {
    const loaded = editable(IdentityProviderType.ActiveDirectory);
    loaded.useSsl = true;
    const service = TestBed.inject(DataManagementIdentityProviderService) as unknown as {
      loadProvider: ReturnType<typeof vi.fn>;
    };
    service.loadProvider.mockResolvedValue(loaded);
    setUp(listItem({ type: IdentityProviderType.ActiveDirectory }), null);

    component.openModal();
    await fixture.whenStable();

    expect(component.persistedUseSsl()).toBe(true);
    expect(component.hasAccountsTab()).toBe(true);
  });

  it('warns about Active Directory and LDAP without SSL and not with SSL', () => {
    const provider = editable(IdentityProviderType.ActiveDirectory);
    setUp(listItem(), provider);
    expect(component.transportWarningKey()).toBe(AD_REQUIRES_SSL_WARNING_KEY);

    provider.type = IdentityProviderType.Ldap;
    expect(component.transportWarningKey()).toBe(LDAP_UNENCRYPTED_WARNING_KEY);

    provider.useSsl = true;
    expect(component.transportWarningKey()).toBeNull();
  });

  it('marks a test count cut off by the server limit with a plus', () => {
    expect(component.userCountLabel({ success: true, userCount: 500, isTruncated: true })).toBe('500+');
    expect(component.userCountLabel({ success: true, userCount: 42, isTruncated: false })).toBe('42');
  });

  it('leaves the approval tab when the type changes to OAuth', () => {
    const provider = editable(IdentityProviderType.Ldap);
    setUp(listItem(), provider);
    component.tabId.set('accounts');

    provider.type = IdentityProviderType.OAuth2;
    component.onTypeChange();

    expect(component.tabId()).toBe('general');
  });
});
