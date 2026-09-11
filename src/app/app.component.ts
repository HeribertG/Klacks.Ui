// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Root component: hosts the router outlet and the global overlays, starts the application-wide
 * services (data refresh, reload coordination, chunk recovery, version watch, SignalR) and signs out
 * a user whose SignalR authentication failed for good.
 */
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, DestroyRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { OverlayRailComponent } from './presentation/overlay-rail/overlay-rail.component';
import { BackendUnavailableOverlayComponent } from './presentation/error/backend-unavailable-overlay/backend-unavailable-overlay.component';
import { KeyboardShortcutDirective } from './presentation/directives/keyboard-shortcut.directive';
import { AsideComponent } from './presentation/aside/aside.component';
import { AsideService } from './presentation/aside/aside.service';
import { TooltipComponent } from './presentation/shared/tooltip/tooltip.component';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { SetupGateService } from 'src/app/presentation/auth/setup-gate.service';
import { SETUP_ROUTE_PATH } from 'src/app/domain/constants/setup.constants';
import { DataRefreshCoordinator } from 'src/app/application/services/data-refresh-coordinator.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { AppReloadCoordinator } from 'src/app/presentation/services/app-reload-coordinator.service';
import { ChunkLoadRecoveryService } from 'src/app/application/services/chunk-load-recovery.service';
import { AppVersionWatchService } from 'src/app/application/services/app-version-watch.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    TranslateModule,
    OverlayRailComponent,
    BackendUnavailableOverlayComponent,
    KeyboardShortcutDirective,
    AsideComponent,
    TooltipComponent,
  ],
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  private directionService = inject(DirectionService);
  private readonly asideService = inject(AsideService);
  private readonly signalRService = inject(SignalRService);
  private readonly authService = inject(AuthService);
  private readonly setupGateService = inject(SetupGateService);
  private readonly dataRefreshCoordinator = inject(DataRefreshCoordinator);
  private readonly assistantSignalR = inject(AssistantSignalRService);
  private readonly appReloadCoordinator = inject(AppReloadCoordinator);
  private readonly chunkLoadRecovery = inject(ChunkLoadRecoveryService);
  private readonly appVersionWatch = inject(AppVersionWatchService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  public title = 'klacks';

  private readonly publicRoutes = ['/login', '/error', `/${SETUP_ROUTE_PATH}`];

  constructor() {
    effect(() => {
      if (this.signalRService.state() === 'AuthFailed') {
        this.handleSignalRAuthFailure();
      }
    });
  }

  ngOnInit(): void {
    this.applicationInitService.initializeBasics();
    this.dataRefreshCoordinator.start();
    this.appReloadCoordinator.start();
    this.chunkLoadRecovery.start();
    this.appVersionWatch.start();
    if (this.authService.authenticated()) {
      void this.signalRService.startConnection();
      void this.assistantSignalR.startConnection();
      void this.setupGateService.checkAndRedirect();
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
