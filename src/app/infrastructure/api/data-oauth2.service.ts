import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MyToken } from 'src/app/domain/models/authentification-class';

export interface OAuth2Provider {
  id: string;
  name: string;
  type: number;
}

export interface OAuth2AuthorizeResponse {
  authorizationUrl: string;
  state: string;
}

export interface OAuth2CallbackRequest {
  code: string;
  state: string;
  redirectUri: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataOAuth2Service {
  private httpClient = inject(HttpClient);

  getProviders(): Observable<OAuth2Provider[]> {
    return this.httpClient.get<OAuth2Provider[]>(
      `${environment.baseUrl}OAuth2/providers`
    );
  }

  authorize(providerId: string, redirectUri: string): Observable<OAuth2AuthorizeResponse> {
    return this.httpClient.get<OAuth2AuthorizeResponse>(
      `${environment.baseUrl}OAuth2/authorize/${providerId}?redirectUri=${encodeURIComponent(redirectUri)}`
    );
  }

  callback(request: OAuth2CallbackRequest): Observable<MyToken> {
    return this.httpClient.post<MyToken>(
      `${environment.baseUrl}OAuth2/callback`,
      request
    );
  }
}
