/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { AppSetting, ISetting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from 'src/app/data/data-settings-various.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { NavigationService } from 'src/app/services/navigation.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from 'src/app/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { MainComponent } from '../main/main.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ModalComponent,
    SpinnerWrapperComponent,
    HeaderComponent,
    NavComponent,
    MainComponent,
    FooterComponent,
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private titleService = inject(Title);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);
  private authorizationService = inject(AuthorizationService);

  @ViewChild('content', { static: false }) private content: any;

  isDashboard = true;
  isProfile = false;
  isSetting = false;
  isClient = false;
  isEditClient = false;
  isAbsence = false;
  isSchedule = false;
  isGroup = false;
  isEditGroup = false;
  isCreateShift = false;
  isShift = false;
  isCutShift = false;
  isGroupStructure = false;

  isSavebarVisible = false;

  private saveBarWrapper = document.querySelector('body');

  public hasGoBackRoute = computed(() => {
    return this.dataManagementSwitchboardService.goBack() !== '';
  });

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClickGoBack();
    }
  }


  ngOnInit(): void {
    this.setDefaults();
    this.setTheme();
    this.tryLoadIcon();
    this.saveBarWrapper!.style.setProperty('--footer_height', '0px');

    this.route.params.subscribe((params) => {
      this.getClientType(params['id']);
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const id = this.route.snapshot.params['id'];
        if (id) {
          this.getClientType(id);
        }
      }
    });

    try {
      this.dataSettingsVariousService.readSettingList().subscribe((l) => {
        if (l) {
          const tmp = l as ISetting[];
          const title = tmp.find((x) => x.type === AppSetting.APP_NAME);
          if (title && title.value) {
            this.titleService.setTitle(title.value);
          }
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  ngOnDestroy(): void {
    // Cleaning up
    localStorage.removeItem('edit-address');
  }

  async canDeactivate(): Promise<boolean> {
    if (this.dataManagementSwitchboardService === undefined) {
      return true;
    }
    if (this.dataManagementSwitchboardService.isDirty === false) {
      return true;
    }

    const isOpen = this.open(this.content);

    if (isOpen) {
      return isOpen.then((x) => {
        if (x) {
          this.dataManagementSwitchboardService.isDirty = false;
        }

        return x;
      });
    }
    return false;
  }
  onIsChanging(value: boolean): void {
    if (value === true) {
      this.dataManagementSwitchboardService.areObjectsDirty();
    } else {
      this.dataManagementSwitchboardService.checkIfDirtyIsNecessary();
    }
  }

  onClickSave(): void {
    this.dataManagementSwitchboardService.onClickSave();
  }

  onClickSaveAndClose(): void {
    this.dataManagementSwitchboardService.onClickSave();
    setTimeout(() => {
      this.onClickGoBack();
    }, 500);
  }

  onIsEnter(): void {
    this.onClickSave();
  }

  onClickReset(): void {
    this.dataManagementSwitchboardService.reset();
  }

  onClickGoBack(): void {
    this.dataManagementSwitchboardService.isDisabled = true;
    this.dataManagementSwitchboardService.reset();
    setTimeout(() => {
      const backRoute = this.dataManagementSwitchboardService.goBack();
      if (backRoute !== '') {
        this.navigationService.navigateToRouterToken(backRoute);
        return;
      }
      this.navigationService.navigateToRoot();
    }, 200);
  }

  private reset(): void {
    this.dataManagementSwitchboardService.showProgressSpinner(false);
    this.isDashboard = false;
    this.isProfile = false;
    this.isSetting = false;
    this.isClient = false;
    this.isEditClient = false;
    this.isAbsence = false;
    this.isSchedule = false;
    this.isGroup = false;
    this.isEditGroup = false;
    this.isCreateShift = false;
    this.isShift = false;
    this.isCutShift = false;
    this.isGroupStructure = false;

    this.dataManagementSwitchboardService.isDisabled = false;
  }

  getClientType(value: string): void {
    this.reset();
    if (!this.checkAccessRights(value)) {
      return;
    }

    switch (value) {
      case 'absence':
        this.isAbsence = true;
        this.isSavebarVisible = false;
        this.setContainerWithMaxSize();

        break;
      case 'dashboard':
        this.setContainerWithNormalSize();
        this.isDashboard = true;
        this.isSavebarVisible = false;

        break;
      case 'edit-address':
        this.setContainerWithNormalSize();
        this.isEditClient = true;
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.EDIT_ADDRESS
          );
        }, 100);
        break;

      case 'client':
        this.setContainerWithNormalSize();
        this.isClient = true;
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.CLIENT
          );
        }, 100);

        break;
      case 'schedule':
        this.isSchedule = true;
        this.setContainerWithMaxSize();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.SCHEDULE
          );
        }, 100);

        break;
      case 'profile':
        this.setContainerWithNormalSize();
        this.isProfile = true;
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.PROFILE
          );
        }, 100);
        break;

      case 'settings':
        this.setContainerWithNormalSize();

        this.isSetting = true;
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.SETTINGS
          );
        }, 100);
        break;
      case 'group':
        this.isGroup = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.GROUP
          );
        }, 100);
        break;
      case 'edit-group':
        this.isEditGroup = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.EDIT_GROUP
          );
        }, 100);
        break;

      case 'group-structure':
        this.isGroupStructure = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.GROUP_STRUCTURE
          );
        }, 100);
        break;

      case 'shift':
        this.isShift = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.SHIFT
          );
        }, 100);
        break;

      case 'cut-shift':
        this.isCutShift = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            RouteName.CUT_SHIFT
          );
        }, 100);
        break;

      case 'new-shift':
      case 'edit-shift':
        this.isCreateShift = true;
        this.setContainerWithNormalSize();
        this.isSavebarVisible = true;
        setTimeout(() => {
          // Both new-shift and edit-shift use the same service route
          const routeName =
            value === 'new-shift' ? RouteName.NEW_SHIFT : RouteName.EDIT_SHIFT;
          this.dataManagementSwitchboardService.setActiveManagerByRoute(
            routeName
          );
        }, 100);
        break;

      default:
        this.isDashboard = true;
        this.isSavebarVisible = false;
    }

    if (this.isSavebarVisible) {
      this.saveBarWrapper!.style.setProperty('--footer_height', '65px');
    } else {
      this.saveBarWrapper!.style.setProperty('--footer_height', '0px');
    }
  }

  open(content: any): Promise<boolean> | void {}

  setContainerWithNormalSize() {
    const containerWrapper = document.getElementById('main_container');
    containerWrapper!.style.setProperty('max-width', '1445px');
  }
  setContainerWithMaxSize() {
    const containerWrapper = document.getElementById('main_container');
    containerWrapper!.style.setProperty('max-width', '100%');
  }

  tryLoadIcon(): void {
    this.dataLoadFileService.downLoadIcon();
    this.dataLoadFileService.downLoadLogo();
  }

  setTheme(): void {
    const currentTheme = localStorage.getItem('theme')
      ? localStorage.getItem('theme')
      : null;
    if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }

  private setDefaults() {
    if (!this.localStorageService.get(MessageLibrary.CURRENT_LANG)) {
      this.localStorageService.set(
        MessageLibrary.CURRENT_LANG,
        MessageLibrary.DEFAULT_LANG
      );
    }
  }

  private checkAccessRights(value: string): boolean {
    switch (value) {
      case 'settings':
      case 'group':
      case 'edit-group':
      case 'new-shift':
      case 'group-structure':
        if (!this.authorizationService.isAdmin) {
          this.navigationService.navigateToNoAccess();
          return false;
        }
    }

    return true;
  }
}
