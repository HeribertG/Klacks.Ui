import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import {
  deleteStack,
  popFromStack,
  pushOnStack,
} from 'src/app/helpers/local-storage-stack';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { AppSetting, ISetting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from 'src/app/data/data-settings-various.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { NavigationService } from 'src/app/services/navigation.service';
import { AuthorizationService } from 'src/app/services/authorization.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
})
export class HomeComponent implements OnInit, OnDestroy {
  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private route = inject(ActivatedRoute);
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
  isGroupStructure = false;

  isSavebarVisible = false;

  private saveBarWrapper = document.querySelector('body');

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClickGoBack();
    }
  }

  @HostListener('window:beforeunload') beforeunload(): void {
    deleteStack();
  }

  ngOnInit(): void {
    this.setDefaults();
    this.setTheme();
    this.tryLoadIcon();
    this.saveBarWrapper!.style.setProperty('--footer_height', '0px');

    this.route.params.subscribe((params) => {
      this.getClientType(params['id']);
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
      const routerToken = popFromStack();
      if (routerToken !== '') {
        this.navigationService.navigateToRouterToken(routerToken);
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
        pushOnStack('workplace/absence');

        this.isAbsence = true;
        this.isSavebarVisible = false;
        this.setContainerWithMax();

        break;
      case 'dashboard':
        pushOnStack('workplace/dashboard');

        this.setContainerWithNormal();
        this.isDashboard = true;
        this.isSavebarVisible = false;

        break;
      case 'edit-address':
        this.setContainerWithNormal();
        this.isEditClient = true;
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementClientService_Edit';
        }, 100);
        break;

      case 'client':
        pushOnStack('workplace/client');

        this.setContainerWithNormal();
        this.isClient = true;
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementClientService';
        }, 100);

        break;
      case 'schedule':
        this.isSchedule = true;
        this.setContainerWithMax();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementScheduleService';
        }, 100);

        break;
      case 'profile':
        this.setContainerWithNormal();
        this.isProfile = true;
        this.isSavebarVisible = true;

        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementProfileService';
        }, 100);
        break;

      case 'settings':
        this.setContainerWithNormal();

        this.isSetting = true;
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementSettingsService';
        }, 100);
        break;
      case 'group':
        pushOnStack('workplace/group');

        this.isGroup = true;
        this.setContainerWithNormal();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementGroupService';
        }, 100);
        break;
      case 'edit-group':
        this.isEditGroup = true;
        this.setContainerWithNormal();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementGroupService_Edit';
        }, 100);
        break;

      case 'group-structure':
        pushOnStack('workplace/group-structure');

        this.isGroupStructure = true;
        this.setContainerWithNormal();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementGroupTreeService_Structure';
        }, 100);
        break;

      case 'shift':
        pushOnStack('workplace/shift');
        this.isShift = true;
        this.setContainerWithNormal();
        this.isSavebarVisible = false;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementShiftService';
        }, 100);
        break;

      case 'edit-shift':
        pushOnStack('workplace/edit-shift');
        this.isCreateShift = true;
        this.setContainerWithNormal();
        this.isSavebarVisible = true;
        setTimeout(() => {
          this.dataManagementSwitchboardService.nameOfVisibleEntity =
            'DataManagementShiftService_Edit';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  open(content: any): Promise<boolean> | void {}

  setContainerWithNormal() {
    const containerWrapper = document.getElementById('main_container');
    containerWrapper!.style.setProperty('max-width', '1445px');
  }
  setContainerWithMax() {
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
      case 'group-structure':
        if (!this.authorizationService.isAdmin) {
          this.navigationService.navigateToNoAccess();
          return false;
        }
    }

    return true;
  }
}
