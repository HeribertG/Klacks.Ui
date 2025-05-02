import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private _isAdmin$ = new BehaviorSubject<boolean>(false);
  private _isAuthorised$ = new BehaviorSubject<boolean>(false);

  constructor(private localStorage: LocalStorageService) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const adminToken = this.localStorage.get(MessageLibrary.TOKEN_ADMIN);
    const authToken = this.localStorage.get(MessageLibrary.TOKEN_AUTHORISED);

    this._isAdmin$.next(JSON.parse(adminToken ?? 'false'));
    this._isAuthorised$.next(JSON.parse(authToken ?? 'false'));
  }

  refresh() {
    this.loadFromStorage();
  }

  get isAdmin(): boolean {
    return this._isAdmin$.value;
  }
  get isAuthorised(): boolean {
    return this._isAuthorised$.value;
  }
}
