// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source of truth for what the signed-in user is allowed to do. The rights list is the one
 * the backend expanded at login (role names plus their granular permissions) and it is cached in
 * localStorage, so a reload answers without a round trip; every reader goes through this service
 * instead of touching localStorage directly.
 */
import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private localStorage = inject(LocalStorageService);

  private readonly _permissions = signal<readonly string[]>([]);

  readonly permissions = this._permissions.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Persists the rights list the backend returned with a login or a token refresh. A response
   * without a list is a backend defect, not a user without rights: overwriting the cached list with
   * an empty one would strip a legitimate session of everything it may do, and a stored empty list
   * would additionally tell backfillPermissionsIfMissing that the repair already happened. Such a
   * response is therefore logged and otherwise ignored, leaving the previous value in place.
   * @param permissions - Role names and granular permissions, exactly as sent by the backend
   */
  store(permissions: readonly string[] | null | undefined): void {
    if (permissions === null || permissions === undefined) {
      console.error(
        'AuthorizationService: the backend returned no permissions list; keeping the previously stored rights.',
      );
      return;
    }

    const sanitised = this.sanitise(permissions);
    this.localStorage.set(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify(sanitised));
    this._permissions.set(sanitised);
  }

  clear(): void {
    this.localStorage.remove(StorageKeys.TOKEN_PERMISSIONS);
    this._permissions.set([]);
  }

  refresh(): void {
    this.loadFromStorage();
  }

  /**
   * Whether a rights list was ever stored for this session. False for a session that was opened
   * before the backend started sending one, which is what lets the caller repair it.
   */
  hasStoredPermissions(): boolean {
    return this.localStorage.get(StorageKeys.TOKEN_PERMISSIONS) !== null;
  }

  /**
   * @param permission - A constant from PERMISSIONS, or a role name such as ROLE_ADMIN
   */
  hasPermission(permission: string): boolean {
    const current = this._permissions();
    return current.includes(ROLE_ADMIN) || current.includes(permission);
  }

  /**
   * An empty argument list asks whether the user passes a check that names no right at all, which
   * only the full-access role does - the same answer the backend gives, so a UI gate and the
   * endpoint behind it cannot disagree.
   * @param permissions - Rights of which at least one has to be held
   */
  hasAnyPermission(...permissions: string[]): boolean {
    if (permissions.length === 0) {
      return this.isAdmin;
    }

    return permissions.some((permission) => this.hasPermission(permission));
  }

  get isAdmin(): boolean {
    return this._permissions().includes(ROLE_ADMIN);
  }

  get isAuthorised(): boolean {
    return this.isAdmin || this._permissions().includes(ROLE_AUTHORISED);
  }

  private loadFromStorage(): void {
    const stored = this.localStorage.get(StorageKeys.TOKEN_PERMISSIONS);
    if (!stored) {
      this._permissions.set([]);
      return;
    }

    try {
      this._permissions.set(this.sanitise(JSON.parse(stored)));
    } catch {
      this._permissions.set([]);
    }
  }

  private sanitise(permissions: unknown): readonly string[] {
    if (!Array.isArray(permissions)) {
      return [];
    }

    return permissions.filter((entry): entry is string => typeof entry === 'string');
  }
}
