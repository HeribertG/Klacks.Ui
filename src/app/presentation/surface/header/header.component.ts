// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main application header with logo, search, group selector, and navigation controls.
 */
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { IconSignOutComponent } from 'src/app/presentation/icons/icon-sign-out.component';
import { SearchComponent } from 'src/app/presentation/search/search.component';
import { SearchClientComponent } from 'src/app/presentation/search/search-client/search-client.component';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { SearchService } from 'src/app/application/services/search.service';
import { IClient } from 'src/app/domain/models/client/client-class';
import { AsideService } from '../../aside/aside.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { IconLogoComponent } from '../../icons/icon-logo.component';
import { SignalRStatusIndicatorComponent } from './signalr-status-indicator/signalr-status-indicator.component';
import { DataManagementProactiveInboxService } from 'src/app/domain/services/assistant/data-management-proactive-inbox.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    SearchComponent,
    SearchClientComponent,
    GroupSelectComponent,
    IconSignOutComponent,
    FontAwesomeModule,
    TranslateModule,
    IconMMLComponent,
    IconLogoComponent,
    SignalRStatusIndicatorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public dataLoadFileService = inject(DataLoadFileService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public searchService = inject(SearchService);
  public proactiveInboxService = inject(DataManagementProactiveInboxService);

  private auth = inject(AuthService);
  private navigationService = inject(NavigationService);
  private asideService = inject(AsideService);
  private appSettings = inject(AppSettingsManagementService);
  private onboarding = inject(OnboardingService);

  public authorised = signal<boolean>(false);
  public readonly version = signal<string>('');

  public readonly isFloatingMode = computed<boolean>(() => {
    const mode = this.appSettings.speechSettings().outputMode;
    return mode === OutputMode.Audio || mode === OutputMode.BothAuto;
  });
  public readonly hideAssistantButton = computed<boolean>(
    () => this.isFloatingMode() && this.asideService.isVisible(),
  );
  public readonly isTourActive = computed<boolean>(() =>
    this.onboarding.isTourActive(),
  );
  public readonly logoImage = computed(() => this.dataLoadFileService.logoImage$());
  public readonly hasLogoImage = computed(() => !!this.logoImage());
  public readonly logoDimensions = computed(() =>
    this.dataLoadFileService.logoImageDimensions$()
  );
  public readonly logoDisplayDimensions = computed(() => {
    const dimensions = this.logoDimensions();
    if (!dimensions) {
      return { width: 32, height: 32 };
    }
    return this.dataLoadFileService.calculateProportionalDimensions(
      dimensions.width,
      dimensions.height,
      32,
      32,
      40,
    );
  });

  constructor() {
    this.authorised.set(this.auth.authenticated());
    if (this.auth.authenticated()) {
      this.proactiveInboxService.refreshUnreadCount();
    }
  }

  onClickDashboard(): void {
    this.navigationService.navigateToDashboard();
  }

  async onClickLogOut(): Promise<void> {
    if (this.auth.isOAuth2User()) {
      this.authorised.set(false);
      await this.auth.logOutWithSso();
    } else {
      this.auth.logOut();
      this.navigationService.navigateToRoot().then(() => {
        this.authorised.set(false);
      });
    }
  }

  onClientSelected(client: IClient): void {
    this.searchService.emitClientSelected(client);
  }

  onToggleAssistant(): void {
    this.asideService.toggle();
  }
}
