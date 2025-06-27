/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  EffectRef,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { GroupSelectComponent } from 'src/app/group-select/group-select.component';
import { IconSignOutComponent } from 'src/app/icons/icon-sign-out.component';
import { SearchComponent } from 'src/app/search/search.component';
import { NavigationService } from 'src/app/services/navigation.service';
import { ThemeService } from 'src/app/services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SearchComponent,
    GroupSelectComponent,
    IconSignOutComponent,
  ],
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  public dataLoadFileService = inject(DataLoadFileService);
  private navigationService = inject(NavigationService);
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);
  private injector = inject(Injector);

  private currentTheme = signal<string>('light');
  logoImage = signal<string | null>(null);
  searchString = signal<string>('');
  version = signal<string>('');
  authorised = signal<boolean>(false);
  selectedName = signal<string>('new-address');

  hasLogoImage = computed(() => !!this.logoImage());

  imageName = computed(() => {
    const theme = this.currentTheme();
    return theme === 'dark' ? 'ok-symbol dark.png' : 'ok-symbol.png';
  });

  public registerDropdown: HTMLDivElement | undefined;

  get ImageName(): string {
    return this.imageName();
  }

  private ngUnsubscribe = new Subject<void>();
  private effectRefs: EffectRef[] = [];
  private logoImageInterval: any;

  constructor() {
    this.setupEffects();
  }

  ngAfterViewInit(): void {
    this.initializeTheme();
    this.setupRxJSSubscriptions();
    this.startLogoImageWatcher();
    this.initializeAuthState();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];

    if (this.logoImageInterval) {
      clearInterval(this.logoImageInterval);
    }
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const themeEffect = effect(() => {
        const theme = this.currentTheme();
        console.log('Theme changed to:', theme);
      });
      this.effectRefs.push(themeEffect);

      const logoEffect = effect(() => {
        const logo = this.logoImage();
        if (logo) {
          console.log('Logo image loaded:', logo);
        }
      });
      this.effectRefs.push(logoEffect);
    });
  }

  private setupRxJSSubscriptions(): void {
    // Theme subscription
    this.themeService.theme$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((theme) => {
        this.currentTheme.set(theme);
      });
  }

  private initializeTheme(): void {
    const currentTheme = this.themeService.getCurrentTheme();
    this.currentTheme.set(currentTheme);
  }

  private initializeAuthState(): void {
    const currentAuthState = this.auth.authenticated();
    this.authorised.set(currentAuthState);
  }

  private startLogoImageWatcher(): void {
    let attempts = 0;
    const maxAttempts = 20; // 10 Sekunden

    this.logoImageInterval = setInterval(() => {
      if (this.dataLoadFileService.logoImage) {
        this.logoImage.set(this.dataLoadFileService.logoImage);
        clearInterval(this.logoImageInterval);
      } else if (attempts >= maxAttempts) {
        clearInterval(this.logoImageInterval);
      }
      attempts++;
    }, 500);

    // Initial check
    if (this.dataLoadFileService.logoImage) {
      this.logoImage.set(this.dataLoadFileService.logoImage);
      clearInterval(this.logoImageInterval);
    }
  }

  // Public Methods
  onClickDashboard(): void {
    this.navigationService.navigateToDashboard();
  }

  onClickLogOut(): void {
    this.auth.logOut();
    this.authorised.set(false);
  }

  // Utility methods für potentielle Integration
  updateSearchString(searchValue: string): void {
    this.searchString.set(searchValue);
  }

  updateSelection(selection: string): void {
    this.selectedName.set(selection);
  }

  setVersion(versionString: string): void {
    this.version.set(versionString);
  }

  // Getter für Template-Kompatibilität
  get currentThemeValue(): string {
    return this.currentTheme();
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

  // Legacy method für Backward Compatibility
  private setTheme(): void {
    const currentTheme = this.themeService.getCurrentTheme();
    this.currentTheme.set(currentTheme);
  }
}
