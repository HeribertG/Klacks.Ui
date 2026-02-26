// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import {
  AfterViewInit,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
  effect,
  EffectRef,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
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
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ThemeService } from 'src/app/presentation/services/theme.service';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { InboxService } from 'src/app/domain/services/email/inbox.service';

type NavigationPage =
  | 'absence'
  | 'group'
  | 'shift'
  | 'schedule'
  | 'client'
  | 'profile'
  | 'settings'
  | 'edit-address'
  | 'edit-group'
  | 'inbox'
  | '';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  imports: [
    NgbTooltipModule,
    IconGanttComponent,
    IconGroupComponent,
    IconOrderComponent,
    IconTimeScheduleComponent,
    IconClientsComponent,
    IconUserComponent,
    IconSettingComponent
],
})
export class NavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('absenceIcon') absenceIcon!: IconGanttComponent;
  @ViewChild('groupIcon') groupIcon!: IconGroupComponent;
  @ViewChild('shiftIcon') shiftIcon!: IconOrderComponent;
  @ViewChild('scheduleIcon') scheduleIcon!: IconTimeScheduleComponent;
  @ViewChild('employeesIcon') employeesIcon!: IconClientsComponent;
  @ViewChild('userIcon') userIcon!: IconUserComponent;
  @ViewChild('settingsIcon') settingsIcon!: IconSettingComponent;

  // Services
  public authorizationService = inject(AuthorizationService);
  public router = inject(Router);
  public dataLoadFileService = inject(DataLoadFileService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private translateStringConstantsService = inject(
    TranslateStringConstantsService
  );
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private themeService = inject(ThemeService);
  private urlParameterService = inject(UrlParameterService);
  private injector = inject(Injector);

  public inboxService = inject(InboxService);

  private currentLanguage = signal<string>(DomainMessages.DEFAULT_LANG);
  private currentTheme = signal<string>('');
  private currentPage = signal<NavigationPage>('');
  private iconsInitialized = signal<boolean>(false);
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
      case 'inbox':
        return 'inbox';
      default:
        return '';
    }
  });

  absence = DomainMessages.ABSENCE;
  all_schedule = DomainMessages.ALL_SCHEDULE;
  all_employee = DomainMessages.ALL_EMPLOYEE;
  all_group = DomainMessages.ALL_GROUP;
  all_shift = DomainMessages.ALL_SHIFT;
  statistic = DomainMessages.STATISTIC;

  private ngUnsubscribe = new Subject<void>();
  private effectRefs: EffectRef[] = [];

  constructor() {
    this.setupEffects();
  }

  ngOnInit(): void {
    this.initializeTranslation();
    this.loadSavedLanguage();
    this.tryLoadProfileImage();
    this.updateCurrentPage();
    this.inboxService.refreshUnreadCount();

    this.absence = DomainMessages.ABSENCE;
    this.all_schedule = DomainMessages.ALL_SCHEDULE;
    this.all_employee = DomainMessages.ALL_EMPLOYEE;
    this.all_group = DomainMessages.ALL_GROUP;
    this.all_shift = DomainMessages.ALL_SHIFT;
    this.statistic = DomainMessages.STATISTIC;
  }

  ngAfterViewInit(): void {
    this.iconsInitialized.set(true);
    this.setupRxJSSubscriptions();

    this.updateTranslations();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const langEffect = effect(() => {
        const lang = this.currentLanguage();
        this.translateService.use(lang);
        this.localStorageService.set(StorageKeys.CURRENT_LANG, lang);
        this.translateStringConstantsService.translate();
        this.localeService.setLocale(lang);
      });
      this.effectRefs.push(langEffect);

      const themeSyncEffect = effect(() => {
        this.currentTheme.set(this.themeService.theme());
      });
      this.effectRefs.push(themeSyncEffect);

      const themeEffect = effect(() => {
        const theme = this.currentTheme();
        if (theme && this.iconsInitialized()) {
          this.resetIconColor();
          this.setSelectedIconColor();
        }
      });
      this.effectRefs.push(themeEffect);

      const pageEffect = effect(() => {
        if (this.iconsInitialized()) {
          this.resetIconColor();
          this.setSelectedIconColor();
        }
      });
      this.effectRefs.push(pageEffect);

      const iconEffect = effect(() => {
        const selected = this.selectedIcon();
        if (this.iconsInitialized() && selected) {
          this.resetIconColor();
          this.activateIcon(selected);
        }
      });
      this.effectRefs.push(iconEffect);
    });
  }

  private setupRxJSSubscriptions(): void {
    // Language change subscription - verwende original approach
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        setTimeout(() => {
          this.updateTranslations();
        }, 200);
      });
  }

  private updateTranslations(): void {
    // Original approach - aktualisiere properties direkt
    this.absence = DomainMessages.ABSENCE;
    this.all_schedule = DomainMessages.ALL_SCHEDULE;
    this.all_employee = DomainMessages.ALL_EMPLOYEE;
    this.all_group = DomainMessages.ALL_GROUP;
    this.all_shift = DomainMessages.ALL_SHIFT;
    this.statistic = DomainMessages.STATISTIC;
  }

  private initializeTranslation(): void {
    this.translateService.setDefaultLang(DomainMessages.DEFAULT_LANG);
  }

  private loadSavedLanguage(): void {
    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    if (savedLang) {
      this.onChangeLanguage(savedLang);
    }
  }

  private updateCurrentPage(): void {
    const page =
      this.urlParameterService.getWorkplaceSubRoute() as NavigationPage;
    this.currentPage.set(page);
  }

  private tryLoadProfileImage(): void {
    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    if (id) {
      const imgId = `${id}profile`;
      this.dataLoadFileService.downLoadFile(imgId);
      this.startProfileImageWatcher();
    }
  }

  private startProfileImageWatcher(): void {
    // No longer needed since we use reactive signals directly from DataLoadFileService
    // The profileImage$() signal will automatically update when the image loads
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

  onClickInbox(): void {
    this.currentPage.set('inbox');
    this.navigationService.navigateToInbox();
  }

  onChangeLanguage(lang: string): void {
    this.translateService.use(lang);
    localStorage.setItem(StorageKeys.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang);
    this.currentLanguage.set(lang);
  }

  // Icon Management
  private resetIconColor(): void {
    const icons = [
      this.absenceIcon,
      this.groupIcon,
      this.shiftIcon,
      this.scheduleIcon,
      this.employeesIcon,
      this.userIcon,
      this.settingsIcon,
    ];

    icons.forEach((icon) => {
      if (icon) {
        icon.ChangeColor();
      }
    });
  }

  private activateIcon(iconName: string): void {
    const iconMap = {
      absence: this.absenceIcon,
      group: this.groupIcon,
      shift: this.shiftIcon,
      schedule: this.scheduleIcon,
      employees: this.employeesIcon,
      user: this.userIcon,
      settings: this.settingsIcon,
    };

    const icon = iconMap[iconName as keyof typeof iconMap];
    if (icon) {
      icon.ChangeColor(true);
    }
  }

  private setSelectedIconColor(): void {
    const selectedIcon = this.selectedIcon();
    if (selectedIcon) {
      this.activateIcon(selectedIcon);
    }
  }
}
