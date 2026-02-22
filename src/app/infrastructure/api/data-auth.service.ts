// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MyToken } from 'src/app/domain/models/authentification-class';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataAuthService {
  private httpClient = inject(HttpClient);

  login(request: LoginRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}Accounts/LoginUser`,
      request
    );
  }

  refreshToken(request: RefreshTokenRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}Accounts/RefreshToken`,
      request
    );
  }
}
