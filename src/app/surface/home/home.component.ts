/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { AppSetting, ISetting } from 'src/app/core/settings-various-class';
import { DataSettingsVariousService } from 'src/app/data/data-settings-various.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { NavigationService } from 'src/app/services/navigation.service';
import { LayoutService } from 'src/app/services/layout.service';
import { CanComponentDeactivate } from 'src/app/helpers/can-deactivate.guard';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from 'src/app/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { MainComponent } from '../main/main.component';

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
export class HomeComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  public workplaceStateService = inject(
    WorkplaceStateService
  );
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private layoutService = inject(LayoutService);
  private titleService = inject(Title);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);

  @ViewChild('content', { static: false }) private content: any;

  // Save bar visibility based on route
  public isSavebarVisible = computed(() => {
    const url = this.router.url;
    return (
      url.includes('/edit-') ||
      url.includes('/profile') ||
      url.includes('/settings') ||
      url.includes('/group-structure') ||
      url.includes('/new-shift') ||
      url.includes('/cut-shift')
    );
  });

  private saveBarWrapper = document.querySelector('body');

  public hasGoBackRoute = computed(() => {
    return this.workplaceStateService.goBack() !== '';
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

    // Watch for route changes to update footer height and container size
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => {
          this.updateFooterHeight();
          this.layoutService.setContainerSizeForRoute(event.url);
        }, 0);
      }
    });

    // Set initial container size and footer height
    this.layoutService.setContainerSizeForRoute(this.router.url);
    setTimeout(() => {
      this.updateFooterHeight();
    }, 0);

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
    if (this.workplaceStateService === undefined) {
      return true;
    }
    if (this.workplaceStateService.isDirty === false) {
      return true;
    }

    const isOpen = this.open(this.content);

    if (isOpen) {
      return isOpen.then((x) => {
        if (x) {
          this.workplaceStateService.isDirty = false;
        }

        return x;
      });
    }
    return false;
  }
  onIsChanging(value: boolean): void {
    if (value === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  onClickSave(): void {
    this.workplaceStateService.onClickSave();
  }

  onClickSaveAndClose(): void {
    this.workplaceStateService.onClickSave();
    setTimeout(() => {
      this.onClickGoBack();
    }, 500);
  }

  onIsEnter(): void {
    this.onClickSave();
  }

  onClickReset(): void {
    this.workplaceStateService.reset();
  }

  onClickGoBack(): void {
    this.workplaceStateService.isDisabled = true;
    this.workplaceStateService.reset();
    setTimeout(() => {
      const backRoute = this.workplaceStateService.goBack();
      if (backRoute !== '') {
        this.navigationService.navigateToRouterToken(backRoute);
        return;
      }
      this.navigationService.navigateToRoot();
    }, 200);
  }

  private updateFooterHeight(): void {
    if (this.isSavebarVisible()) {
      this.saveBarWrapper!.style.setProperty('--footer_height', '65px');
    } else {
      this.saveBarWrapper!.style.setProperty('--footer_height', '0px');
    }
  }

  open(content: any): Promise<boolean> | void {}

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
}
