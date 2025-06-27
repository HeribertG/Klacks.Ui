/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
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
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { IconClientsComponent } from 'src/app/icons/icon-clients.component';
import { IconGanttComponent } from 'src/app/icons/icon-gantt.component';
import { IconGroupComponent } from 'src/app/icons/icon-group.component';
import { IconOrderComponent } from 'src/app/icons/icon-order.component';
import { IconSettingComponent } from 'src/app/icons/icon-setting.component';
import { IconTimeScheduleComponent } from 'src/app/icons/icon-time-schedule.component';
import { IconUserComponent } from 'src/app/icons/icon-user.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {
  LocaleService,
  SupportedLocales,
} from 'src/app/services/locale.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { ThemeService } from 'src/app/services/theme.service';
import { UrlParameterService } from 'src/app/services/url-parameter.service';
import { TranslateStringConstantsService } from 'src/app/translate/translate-string-constants.service';

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
  | '';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  imports: [
    CommonModule,
    NgbTooltipModule,
    IconGanttComponent,
    IconGroupComponent,
    IconOrderComponent,
    IconTimeScheduleComponent,
    IconClientsComponent,
    IconUserComponent,
    IconSettingComponent,
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

  private currentLanguage = signal<string>(MessageLibrary.DEFAULT_LANG);
  private currentTheme = signal<string>('');
  private currentPage = signal<NavigationPage>('');
  private iconsInitialized = signal<boolean>(false);
  profileImage = signal<string | null>(null);

  isAdmin = computed(() => this.authorizationService.isAdmin);
  hasProfileImage = computed(() => !!this.profileImage());

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
      default:
        return '';
    }
  });

  absence = MessageLibrary.ABSENCE;
  all_schedule = MessageLibrary.ALL_SCHEDULE;
  all_employee = MessageLibrary.ALL_EMPLOYEE;
  all_group = MessageLibrary.ALL_GROUP;
  all_shift = MessageLibrary.ALL_SHIFT;
  statistic = MessageLibrary.STATISTIC;

  private ngUnsubscribe = new Subject<void>();
  private effectRefs: EffectRef[] = [];
  private profileImageInterval: any;

  constructor() {
    this.setupEffects();
  }

  ngOnInit(): void {
    this.initializeTranslation();
    this.loadSavedLanguage();
    this.tryLoadProfileImage();
    this.updateCurrentPage();

    this.absence = MessageLibrary.ABSENCE;
    this.all_schedule = MessageLibrary.ALL_SCHEDULE;
    this.all_employee = MessageLibrary.ALL_EMPLOYEE;
    this.all_group = MessageLibrary.ALL_GROUP;
    this.all_shift = MessageLibrary.ALL_SHIFT;
    this.statistic = MessageLibrary.STATISTIC;
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

    if (this.profileImageInterval) {
      clearInterval(this.profileImageInterval);
    }
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const langEffect = effect(() => {
        const lang = this.currentLanguage();
        this.translateService.use(lang);
        this.localStorageService.set(MessageLibrary.CURRENT_LANG, lang);
        this.translateStringConstantsService.translate();
        this.localeService.setLocale(lang as SupportedLocales);
      });
      this.effectRefs.push(langEffect);

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
    // Theme subscription
    this.themeService.theme$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((theme) => {
        this.currentTheme.set(theme);
      });

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
    this.absence = MessageLibrary.ABSENCE;
    this.all_schedule = MessageLibrary.ALL_SCHEDULE;
    this.all_employee = MessageLibrary.ALL_EMPLOYEE;
    this.all_group = MessageLibrary.ALL_GROUP;
    this.all_shift = MessageLibrary.ALL_SHIFT;
    this.statistic = MessageLibrary.STATISTIC;
  }

  private initializeTranslation(): void {
    this.translateService.setDefaultLang(MessageLibrary.DEFAULT_LANG);
  }

  private loadSavedLanguage(): void {
    const savedLang = this.localStorageService.get(MessageLibrary.CURRENT_LANG);
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
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);
    if (id) {
      const imgId = `${id}profile`;
      this.dataLoadFileService.downLoadFile(imgId);
      this.startProfileImageWatcher();
    }
  }

  private startProfileImageWatcher(): void {
    let attempts = 0;
    const maxAttempts = 20;

    this.profileImageInterval = setInterval(() => {
      if (this.dataLoadFileService.profileImage) {
        this.profileImage.set(this.dataLoadFileService.profileImage);
        clearInterval(this.profileImageInterval);
      } else if (attempts >= maxAttempts) {
        clearInterval(this.profileImageInterval);
      }
      attempts++;
    }, 200);

    if (this.dataLoadFileService.profileImage) {
      this.profileImage.set(this.dataLoadFileService.profileImage);
      clearInterval(this.profileImageInterval);
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

  onChangeLanguage(lang: string): void {
    this.translateService.use(lang);
    localStorage.setItem(MessageLibrary.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang as SupportedLocales);
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
