 
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
  EffectRef,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { GroupSelectComponent } from 'src/app/presentation/group-select/group-select.component';
import { IconSignOutComponent } from 'src/app/presentation/icons/icon-sign-out.component';
import { SearchComponent } from 'src/app/presentation/search/search.component';
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

  private auth = inject(AuthService);
  private injector = inject(Injector);
  private navigationService = inject(NavigationService);
  private themeService = inject(ThemeService);

  public authorised = signal<boolean>(false);
  public logoImage = computed(() => this.dataLoadFileService.logoImage$());
  public hasLogoImage = computed(() => !!this.logoImage());
  public logoDimensions = computed(() => this.dataLoadFileService.logoImageDimensions$());
  
  // Calculated proportional dimensions for the logo
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
      40  // absolute max
    );
  });
  public registerDropdown: HTMLDivElement | undefined;
  public searchString = signal<string>('');
  public selectedName = signal<string>('new-address');
  public version = signal<string>('');

  private currentTheme = signal<string>('light');
  private effectRefs: EffectRef[] = [];
  private ngUnsubscribe = new Subject<void>();

  public imageName = computed(() => {
    const theme = this.currentTheme();
    return theme === 'dark' ? 'ok-symbol dark.png' : 'ok-symbol.png';
  });

  get ImageName(): string {
    return this.imageName();
  }

  constructor() {
    this.setupEffects();
  }

  ngAfterViewInit(): void {
    this.initializeTheme();
    this.setupRxJSSubscriptions();
    this.initializeAuthState();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {});
  }

  private setupRxJSSubscriptions(): void {
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

  onClickDashboard(): void {
    this.navigationService.navigateToDashboard();
  }

  onClickLogOut(): void {
    this.auth.logOut();
    this.navigationService.navigateToRoot().then(() => {
      this.authorised.set(false);
    });
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
}
