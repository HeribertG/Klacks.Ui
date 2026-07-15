// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Side navigation bar providing links to all main workplaces and language/icon management.
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  viewChildren,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { IconClientsComponent } from 'src/app/presentation/icons/icon-clients.component';
import { IconGanttComponent } from 'src/app/presentation/icons/icon-gantt.component';
import { IconGroupComponent } from 'src/app/presentation/icons/icon-group.component';
import { IconOrderComponent } from 'src/app/presentation/icons/icon-order.component';
import { IconSettingComponent } from 'src/app/presentation/icons/icon-setting.component';
import { IconTimeScheduleComponent } from 'src/app/presentation/icons/icon-time-schedule.component';
import { IconUserComponent } from 'src/app/presentation/icons/icon-user.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ThemeService } from 'src/app/presentation/services/theme.service';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { InboxVisibilityService } from 'src/app/domain/services/email/inbox-visibility.service';
import { LOADING_INDICATOR_TOKEN } from 'src/app/domain/interfaces/loading-indicator.interface';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { PluginNavItem } from 'src/app/domain/models/plugins/plugin-nav-item';
import { IconAvailabilityComponent } from '../../icons/icon-availability.component';
import { IconMailComponent } from '../../icons/icon-mail.component';
import { PluginIconComponent } from '../../icons/plugin-icon.component';
import { IconPeriodClosingComponent } from '../../icons/icon-period-closing.component';
import { TooltipAutoCloseDirective } from '../../directives/tooltip-auto-close.directive';

type NavigationPage =
  | 'absence'
  | 'group'
  | 'shift'
  | 'schedule'
  | 'client'
  | 'client-availability'
  | 'profile'
  | 'settings'
  | 'edit-address'
  | 'edit-group'
  | 'inbox'
  | 'period-closing'
  | (string & {});

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  imports: [
    NgbTooltipModule,
    TranslateModule,
    IconGanttComponent,
    IconGroupComponent,
    IconOrderComponent,
    IconTimeScheduleComponent,
    IconClientsComponent,
    IconUserComponent,
    IconSettingComponent,
    IconAvailabilityComponent,
    IconMailComponent,
    PluginIconComponent,
    IconPeriodClosingComponent,
    TooltipAutoCloseDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent implements OnInit {
  readonly scheduleIcon = viewChild<IconTimeScheduleComponent>('scheduleIcon');
  readonly absenceIcon = viewChild<IconGanttComponent>('absenceIcon');
  readonly availabilityIcon = viewChild<IconAvailabilityComponent>('availabilityIcon');
  readonly shiftIcon = viewChild<IconOrderComponent>('shiftIcon');
  readonly employeesIcon = viewChild<IconClientsComponent>('employeesIcon');
  readonly groupIcon = viewChild<IconGroupComponent>('groupIcon');
  readonly periodClosingIcon = viewChild<IconPeriodClosingComponent>('periodClosingIcon');
  readonly mailIcon = viewChild<IconMailComponent>('mailIcon');
  readonly userIcon = viewChild<IconUserComponent>('userIcon');
  readonly settingsIcon = viewChild<IconSettingComponent>('settingsIcon');
  readonly pluginIcons = viewChildren(PluginIconComponent);

  public authorizationService = inject(AuthorizationService);
  public router = inject(Router);
  public dataLoadFileService = inject(DataLoadFileService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private translateStringConstantsService = inject(TranslateStringConstantsService);
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private languageConfigService = inject(LanguageConfigService);
  private directionService = inject(DirectionService);
  private themeService = inject(ThemeService);
  private urlParameterService = inject(UrlParameterService);
  private destroyRef = inject(DestroyRef);

  public inboxService = inject(InboxService);
  public inboxVisibilityService = inject(InboxVisibilityService);
  public featurePluginState = inject(FeaturePluginStateService);
  private spinnerService = inject(LOADING_INDICATOR_TOKEN);

  public tooltipPlacement = computed(() => (this.directionService.direction() === 'rtl' ? 'left' : 'right'));

  private currentLanguage = signal<string>(this.languageConfigService.getDefaultLanguage());
  private currentTheme = computed(() => this.themeService.theme());
  private currentPage = signal<NavigationPage>('');

  isAdmin = computed(() => this.authorizationService.isAdmin);
  hasProfileImage = computed(() => !!this.dataLoadFileService.profileImage$());

  selectedIcon = computed(() => {
    const page = this.currentPage();
    switch (page) {
      case 'client':
      case 'edit-address':
        return 'employees';
      case 'settings':
        return 'settings';
      case 'profile':
        return 'user';
      case 'group':
      case 'edit-group':
        return 'group';
      case 'shift':
        return 'shift';
      case 'absence':
        return 'absence';
      case 'schedule':
        return 'schedule';
      case 'client-availability':
        return 'availability';
      case 'inbox':
        return 'inbox';
      case 'period-closing':
        return 'period-closing';
      default:
        if (this.isPluginPage(page)) {
          return 'plugin:' + page;
        }
        return '';
    }
  });

  readonly absence = DomainMessages.ABSENCE;
  readonly all_schedule = DomainMessages.ALL_SCHEDULE;
  readonly all_employee = DomainMessages.ALL_EMPLOYEE;
  readonly all_shift = DomainMessages.ALL_SHIFT;
  readonly statistic = DomainMessages.STATISTIC;
  readonly inbox = DomainMessages.INBOX;

  constructor() {
    this.setupEffects();
  }

  ngOnInit(): void {
    this.initializeTranslation();
    this.loadSavedLanguage();
    this.tryLoadProfileImage();
    this.updateCurrentPage();
    this.inboxVisibilityService.ensureSettingsLoaded();
    this.inboxService.refreshUnreadCount();
    this.featurePluginState.ensureLoaded();

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.spinnerService.showProgressSpinner = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.spinnerService.showProgressSpinner = false;
      }
    });
  }

  private setupEffects(): void {
    effect(() => {
      const lang = this.currentLanguage();
      this.translateService.use(lang);
      this.localStorageService.set(StorageKeys.CURRENT_LANG, lang);
      this.translateStringConstantsService.translate();
      this.localeService.setLocale(lang);
    });

    effect(() => {
      this.currentTheme();
      const selected = this.selectedIcon();
      if (!this.scheduleIcon()) return;
      this.resetIconColor();
      if (selected) {
        this.activateIcon(selected);
      }
    });
  }

  private initializeTranslation(): void {
    this.translateService.setDefaultLang(this.languageConfigService.getDefaultLanguage());
  }

  private loadSavedLanguage(): void {
    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    const lang = this.languageConfigService.resolveInitialLanguage(savedLang);
    this.onChangeLanguage(lang);
  }

  private updateCurrentPage(): void {
    const page = this.urlParameterService.getWorkplaceSubRoute() as NavigationPage;
    this.currentPage.set(page);
  }

  private tryLoadProfileImage(): void {
    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    if (id) {
      this.dataLoadFileService.downLoadFile(`${id}profile`);
    }
  }

  onClickAbsence(): void {
    this.currentPage.set('absence');
    this.navigationService.navigateToAbsence();
  }

  onClickGroup(): void {
    this.currentPage.set('group');
    this.navigationService.navigateToGroup();
  }

  onClickShift(): void {
    this.currentPage.set('shift');
    this.navigationService.navigateToShift();
  }

  onClickSchedule(): void {
    this.currentPage.set('schedule');
    this.navigationService.navigateToSchedule();
  }

  onClickClients(): void {
    this.currentPage.set('client');
    this.navigationService.navigateToClient();
  }

  onClickProfile(): void {
    this.currentPage.set('profile');
    this.navigationService.navigateToProfile();
  }

  onClickSettings(): void {
    this.currentPage.set('settings');
    this.navigationService.navigateToSettings();
  }

  onClickPeriodClosing(): void {
    this.currentPage.set('period-closing');
    this.navigationService.navigateToPeriodClosing();
  }

  onClickAvailability(): void {
    this.currentPage.set('client-availability');
    this.navigationService.navigateToClientAvailability();
  }

  onClickInbox(): void {
    this.currentPage.set('inbox');
    this.navigationService.navigateToInbox();
  }

  onClickPlugin(plugin: PluginNavItem): void {
    this.currentPage.set(plugin.name as NavigationPage);
    this.navigationService.navigateToRouterToken(plugin.route);
  }

  onChangeLanguage(lang: string): void {
    this.translateService.use(lang);
    localStorage.setItem(StorageKeys.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang);
    this.currentLanguage.set(lang);
  }

  private resetIconColor(): void {
    [
      this.scheduleIcon(),
      this.absenceIcon(),
      this.availabilityIcon(),
      this.shiftIcon(),
      this.employeesIcon(),
      this.groupIcon(),
      this.periodClosingIcon(),
      this.mailIcon(),
      this.userIcon(),
      this.settingsIcon(),
    ].forEach(icon => icon?.ChangeColor());
    this.pluginIcons().forEach(icon => icon.ChangeColor());
  }

  private activateIcon(iconName: string): void {
    if (iconName.startsWith('plugin:')) {
      this.activatePluginIcon(iconName.substring(7));
      return;
    }

    const iconMap: Record<string, { ChangeColor(active?: boolean): void } | undefined> = {
      absence: this.absenceIcon(),
      group: this.groupIcon(),
      shift: this.shiftIcon(),
      schedule: this.scheduleIcon(),
      employees: this.employeesIcon(),
      user: this.userIcon(),
      settings: this.settingsIcon(),
      availability: this.availabilityIcon(),
      inbox: this.mailIcon(),
      'period-closing': this.periodClosingIcon(),
    };

    iconMap[iconName]?.ChangeColor(true);
  }

  private activatePluginIcon(pluginName: string): void {
    const navItems = this.featurePluginState.pluginNavItems();
    const index = navItems.findIndex(p => p.name === pluginName);
    if (index >= 0) {
      this.pluginIcons()[index]?.ChangeColor(true);
    }
  }

  private isPluginPage(page: string): boolean {
    return this.featurePluginState.pluginNavItems().some(p => p.name === page);
  }
}
