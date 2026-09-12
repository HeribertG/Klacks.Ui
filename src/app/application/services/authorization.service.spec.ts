// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from './authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import {
  PERMISSIONS,
  ROLE_ADMIN,
  ROLE_AUTHORISED,
} from 'src/app/domain/constants/permissions.constants';

describe('AuthorizationService', () => {
  let store: Map<string, string>;

  const storageStub = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };

  const createService = (): AuthorizationService => {
    TestBed.configureTestingModule({
      providers: [{ provide: LocalStorageService, useValue: storageStub }],
    });
    return TestBed.inject(AuthorizationService);
  };

  const givenStored = (permissions: unknown): void => {
    store.set(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify(permissions));
  };

  beforeEach(() => {
    store = new Map<string, string>();
  });

  it('starts empty when nothing was stored, so an unknown session grants nothing', () => {
    const service = createService();

    expect(service.permissions()).toEqual([]);
    expect(service.hasPermission(PERMISSIONS.CanViewClients)).toBe(false);
    expect(service.isAdmin).toBe(false);
    expect(service.isAuthorised).toBe(false);
  });

  it('reads the stored rights list on creation', () => {
    givenStored([PERMISSIONS.CanViewClients, PERMISSIONS.CanViewGroups]);

    const service = createService();

    expect(service.hasPermission(PERMISSIONS.CanViewClients)).toBe(true);
    expect(service.hasPermission(PERMISSIONS.CanEditClients)).toBe(false);
  });

  it('lets an administrator pass every permission check without holding it explicitly', () => {
    givenStored([ROLE_ADMIN]);

    const service = createService();

    expect(service.hasPermission(PERMISSIONS.CanEditSettings)).toBe(true);
    expect(service.hasAnyPermission(PERMISSIONS.CanDeleteClients)).toBe(true);
    expect(service.isAdmin).toBe(true);
    expect(service.isAuthorised).toBe(true);
  });

  it('reports isAuthorised for the supervisor role and for no other role', () => {
    givenStored([ROLE_AUTHORISED, PERMISSIONS.CanViewClients]);

    const service = createService();

    expect(service.isAuthorised).toBe(true);
    expect(service.isAdmin).toBe(false);
  });

  it('answers hasAnyPermission as soon as one of the rights is held', () => {
    givenStored([PERMISSIONS.CanViewShifts]);

    const service = createService();

    expect(
      service.hasAnyPermission(PERMISSIONS.CanEditShifts, PERMISSIONS.CanViewShifts),
    ).toBe(true);
    expect(
      service.hasAnyPermission(PERMISSIONS.CanEditShifts, PERMISSIONS.CanDeleteShifts),
    ).toBe(false);
    expect(service.hasAnyPermission()).toBe(false);
  });

  it('answers an argument-less hasAnyPermission with true only for the full-access role', () => {
    givenStored([ROLE_ADMIN]);

    expect(createService().hasAnyPermission()).toBe(true);
  });

  it('stores the list a login returned and answers from it immediately', () => {
    const service = createService();

    service.store([PERMISSIONS.CanViewGroups]);

    expect(service.hasPermission(PERMISSIONS.CanViewGroups)).toBe(true);
    expect(store.get(StorageKeys.TOKEN_PERMISSIONS)).toBe(
      JSON.stringify([PERMISSIONS.CanViewGroups]),
    );
  });

  it('keeps the rights it already had when a refresh returned none, instead of emptying them', () => {
    givenStored([ROLE_ADMIN]);
    const service = createService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.store(undefined);

    expect(service.permissions()).toEqual([ROLE_ADMIN]);
    expect(store.get(StorageKeys.TOKEN_PERMISSIONS)).toBe(JSON.stringify([ROLE_ADMIN]));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('treats a null list the same as a missing one and writes nothing', () => {
    const service = createService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.store(null);

    expect(service.hasStoredPermissions()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('still stores a genuinely empty list, which is a user the backend gave no rights', () => {
    const service = createService();

    service.store([]);

    expect(service.permissions()).toEqual([]);
    expect(service.hasStoredPermissions()).toBe(true);
  });

  it('clears the list on logout, in storage and in the signal', () => {
    givenStored([ROLE_ADMIN]);
    const service = createService();

    service.clear();

    expect(service.isAdmin).toBe(false);
    expect(service.hasStoredPermissions()).toBe(false);
  });

  it('picks up a list another tab wrote when it is asked to refresh', () => {
    const service = createService();
    givenStored([PERMISSIONS.CanPlan]);

    expect(service.hasPermission(PERMISSIONS.CanPlan)).toBe(false);
    service.refresh();

    expect(service.hasPermission(PERMISSIONS.CanPlan)).toBe(true);
  });

  it('reports a session that predates the rights list as having none stored', () => {
    const service = createService();

    expect(service.hasStoredPermissions()).toBe(false);
  });

  it('grants nothing when the stored value is not a JSON array of strings', () => {
    store.set(StorageKeys.TOKEN_PERMISSIONS, '{ not json');

    expect(createService().permissions()).toEqual([]);
  });

  it('drops non-string entries instead of letting them into a permission check', () => {
    givenStored([PERMISSIONS.CanViewClients, 42, null]);

    expect(createService().permissions()).toEqual([PERMISSIONS.CanViewClients]);
  });
});
