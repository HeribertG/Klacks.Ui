// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
  EffectRef,
  Injector,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { GroupSelectComponent } from 'src/app/presentation/shared/group-select/group-select.component';
import { IconSignOutComponent } from 'src/app/presentation/icons/icon-sign-out.component';
import { SearchComponent } from 'src/app/presentation/search/search.component';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ThemeService } from 'src/app/presentation/services/theme.service';
import { AsideService } from '../../aside/aside.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconMMLComponent } from '../../icons/icon-mml.component';
import { IconLogoComponent } from '../../icons/icon-logo.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    SearchComponent,
    GroupSelectComponent,
    IconSignOutComponent,
    FontAwesomeModule,
    IconMMLComponent,
    IconLogoComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  public dataLoadFileService = inject(DataLoadFileService);
  public dataManagementGroupService = inject(DataManagementGroupService);

  private auth = inject(AuthService);
  private injector = inject(Injector);
  private navigationService = inject(NavigationService);
  private themeService = inject(ThemeService);
  private asideService = inject(AsideService);

  public authorised = signal<boolean>(false);
  public logoImage = computed(() => this.dataLoadFileService.logoImage$());
  public hasLogoImage = computed(() => !!this.logoImage());
  public logoDimensions = computed(() =>
    this.dataLoadFileService.logoImageDimensions$()
  );

  public logoDisplayDimensions = computed(() => {
    const dimensions = this.logoDimensions();
    if (!dimensions) {
      return { width: 32, height: 32 }; // fallback
    }

    return this.dataLoadFileService.calculateProportionalDimensions(
      dimensions.width,
      dimensions.height,
      32, // max width
      32, // max height
      40 // absolute max
    );
  });
  public registerDropdown: HTMLDivElement | undefined;
  public searchString = signal<string>('');
  public selectedName = signal<string>('new-address');
  public version = signal<string>('');

  private effectRefs: EffectRef[] = [];
  private ngUnsubscribe = new Subject<void>();

  ngAfterViewInit(): void {
    this.initializeAuthState();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];
  }

  private initializeAuthState(): void {
    const currentAuthState = this.auth.authenticated();
    this.authorised.set(currentAuthState);
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

  onToggleAssistant(): void {
    this.asideService.toggle();
  }

  updateSearchString(searchValue: string): void {
    this.searchString.set(searchValue);
  }

  updateSelection(selection: string): void {
    this.selectedName.set(selection);
  }

  setVersion(versionString: string): void {
    this.version.set(versionString);
  }

  get logoImageValue(): string | null {
    return this.logoImage();
  }

  get hasLogoImageValue(): boolean {
    return this.hasLogoImage();
  }

  get searchStringValue(): string {
    return this.searchString();
  }

  get versionValue(): string {
    return this.version();
  }

  get authorisedValue(): boolean {
    return this.authorised();
  }

  get selectedNameValue(): string {
    return this.selectedName();
  }
}
