// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private localStorage = inject(LocalStorageService);

  private _isAdmin = signal<boolean>(false);
  private _isAuthorised = signal<boolean>(false);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const adminToken = this.localStorage.get(StorageKeys.TOKEN_ADMIN);
    const authToken = this.localStorage.get(StorageKeys.TOKEN_AUTHORISED);

    this._isAdmin.set(JSON.parse(adminToken ?? 'false'));
    this._isAuthorised.set(JSON.parse(authToken ?? 'false'));
  }

  refresh() {
    this.loadFromStorage();
  }

  get isAdmin(): boolean {
    return this._isAdmin();
  }
  get isAuthorised(): boolean {
    return this._isAuthorised() || this._isAdmin();
  }
}
