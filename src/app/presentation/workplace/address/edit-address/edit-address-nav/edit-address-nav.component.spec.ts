// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests the "find similar clients" entry label of the edit-address navigation: persons show first and last name,
 * legal entities show their company instead of the contact person.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { EditAddressNavComponent } from './edit-address-nav.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { IClient } from 'src/app/domain/models/client/client-class';

const TEMPLATE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'edit-address-nav.component.html');

describe('EditAddressNavComponent find client label', () => {
  const create = (): EditAddressNavComponent => {
    TestBed.configureTestingModule({
      imports: [EditAddressNavComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataManagementClientService, useValue: {} }],
    }).overrideComponent(EditAddressNavComponent, { set: { imports: [], template: '' } });

    return TestBed.createComponent(EditAddressNavComponent).componentInstance;
  };

  const client = (values: Partial<IClient>): IClient => values as IClient;

  afterEach(() => TestBed.resetTestingModule());

  it('shows first and last name for a person', () => {
    const label = create().clientDisplayName(client({ firstName: 'Anna', name: 'Muster', legalEntity: false }));

    expect(label).toBe('Anna Muster');
  });

  it('shows the company for a legal entity that has a contact person', () => {
    const label = create().clientDisplayName(
      client({ company: 'Muster AG', firstName: 'Anna', name: 'Muster', legalEntity: true }),
    );

    expect(label).toBe('Muster AG');
  });

  it('uses the label helper for both list entries in the template', () => {
    const template = readFileSync(TEMPLATE_PATH, 'utf8');

    expect(template.match(/clientDisplayName\(c\)/g)).toHaveLength(2);
    expect(template).not.toContain('{{ c.firstName }} {{ c.name }}');
  });
});
