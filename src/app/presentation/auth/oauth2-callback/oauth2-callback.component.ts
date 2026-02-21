import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DataOAuth2Service } from 'src/app/infrastructure/api/data-oauth2.service';
import { AuthService } from '../auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { TranslateModule } from '@ngx-translate/core';
import { MyToken } from 'src/app/domain/models/authentification-class';

interface OAuth2Token extends MyToken {
  userName?: string;
  expires?: Date;
}

@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="oauth2-callback-container">
      <div class="spinner-container">
        @if (isLoading) {
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">{{ 'login.oauth2.processing' | translate }}</p>
        }
        @if (error) {
          <div class="alert alert-danger" role="alert">
            {{ error }}
          </div>
          <button class="btn btn-primary mt-3" (click)="navigateToLogin()">
            {{ 'login.oauth2.back-to-login' | translate }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .oauth2-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
    .spinner-container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
  `]
})
export class OAuth2CallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataOAuth2Service = inject(DataOAuth2Service);
  private authService = inject(AuthService);
  private navigationService = inject(NavigationService);
  private localStorageService = inject(LocalStorageService);
  private signalRService = inject(SignalRService);
  private assistantSignalRService = inject(AssistantSignalRService);
  private toastService = inject(ToastShowService);

  isLoading = true;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    const errorParam = this.route.snapshot.queryParamMap.get('error');
    const errorDescription = this.route.snapshot.queryParamMap.get('error_description');

    if (errorParam) {
      this.error = errorDescription || errorParam;
      this.isLoading = false;
      return;
    }

    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (!code || !state) {
      this.error = 'Missing code or state parameter';
      this.isLoading = false;
      return;
    }

    const savedState = this.localStorageService.get('oauth2_state');
    const savedRedirectUri = this.localStorageService.get('oauth2_redirect_uri');

    if (savedState !== state) {
      this.error = 'Invalid state parameter';
      this.isLoading = false;
      return;
    }

    try {
      const token = await firstValueFrom(
        this.dataOAuth2Service.callback({
          code,
          state,
          redirectUri: savedRedirectUri || window.location.origin + '/oauth2/callback'
        })
      );

      if (token && token.token) {
        this.storeToken(token, state);
        this.localStorageService.remove('oauth2_state');
        this.localStorageService.remove('oauth2_redirect_uri');
        this.signalRService.startConnection();
        this.assistantSignalRService.startConnection();
        this.navigationService.navigateToWorkplace();
      } else {
        this.error = 'Login failed';
        this.isLoading = false;
      }
    } catch (err) {
      console.error('OAuth2 callback error:', err);
      this.error = 'Authentication failed';
      this.isLoading = false;
    }
  }

  navigateToLogin(): void {
    this.navigationService.navigateToRoot();
  }

  private storeToken(token: OAuth2Token, state: string): void {
    this.localStorageService.set(StorageKeys.TOKEN, token.token);
    this.localStorageService.set(StorageKeys.TOKEN_USERNAME, token.userName || token.username);
    this.localStorageService.set(StorageKeys.TOKEN_USERID, token.id);
    this.localStorageService.set(StorageKeys.TOKEN_EXP, token.expires?.toString() || '');
    this.localStorageService.set(StorageKeys.TOKEN_ADMIN, (token.isAdmin || false).toString());
    this.localStorageService.set(StorageKeys.TOKEN_AUTHORISED, (token.isAuthorised || false).toString());
    if (token.refreshToken) {
      this.localStorageService.set(StorageKeys.TOKEN_REFRESHTOKEN, token.refreshToken);
    }

    const providerId = state.split('_')[0];
    if (providerId) {
      this.localStorageService.set('oauth2_provider_id', providerId);
    }
  }
}
