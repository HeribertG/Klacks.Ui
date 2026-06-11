// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// Version: 1.0.1-deploy-test
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, DestroyRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { ToastsContainerComponent } from './presentation/toast/toast.component';
import { KeyboardShortcutDirective } from './presentation/directives/keyboard-shortcut.directive';
import { AsideComponent } from './presentation/aside/aside.component';
import { AsideService } from './presentation/aside/aside.service';
import { VoiceShellComponent } from './presentation/voice-shell/voice-shell.component';
import { TooltipComponent } from './presentation/shared/tooltip/tooltip.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    TranslateModule,
    ToastsContainerComponent,
    KeyboardShortcutDirective,
    AsideComponent,
    VoiceShellComponent,
    TooltipComponent,
  ],
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  private directionService = inject(DirectionService);
  private readonly asideService = inject(AsideService);
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly signalRService = inject(SignalRService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  public title = 'klacks';

  private readonly publicRoutes = ['/login', '/error'];

  readonly showVoiceShell = computed<boolean>(() =>
    this.asideService.isVisible() &&
    this.appSettings.speechSettings().outputMode === OutputMode.Audio,
  );

  constructor() {
    effect(() => {
      if (this.signalRService.state() === 'AuthFailed') {
        this.handleSignalRAuthFailure();
      }
    });
  }

  ngOnInit(): void {
    this.applicationInitService.initializeBasics();
    if (this.authService.authenticated()) {
      void this.signalRService.startConnection();
    }
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      if (this.publicRoutes.some(r => url.startsWith(r))) {
        this.asideService.hide();
      }
    });
  }

  private handleSignalRAuthFailure(): void {
    const url = this.router.url ?? '';
    if (url.startsWith('/login') || url.startsWith('/oauth2/callback')) {
      return;
    }
    if (!this.authService.authenticated()) {
      return;
    }
    console.warn('[App] SignalR auth failed - clearing stale session and redirecting to login');
    this.authService.logOut();
    void this.router.navigateByUrl('/login');
  }
}
