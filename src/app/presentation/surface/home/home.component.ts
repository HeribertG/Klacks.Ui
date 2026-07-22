// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Root layout component that assembles the main app shell (header, nav, main, savebar, footer) and,
 * on a fresh database, auto-opens the assistant aside so the setup-tour offer is visible without
 * requiring the user to find and click the assistant toggle first.
 */
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from 'src/app/presentation/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/presentation/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { MainComponent } from '../main/main.component';
import { SavebarComponent } from '../savebar/savebar.component';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ModalComponent,
    SpinnerWrapperComponent,
    HeaderComponent,
    NavComponent,
    MainComponent,
    SavebarComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  private spinnerService = inject(SpinnerService);
  private onboardingService = inject(OnboardingService);
  private asideService = inject(AsideService);

  ngOnInit(): void {
    this.spinnerService.interceptorSuppressed = true;
    this.applicationInitService.initialize();
    this.openAsideOnFreshDatabase();
  }

  private openAsideOnFreshDatabase(): void {
    this.onboardingService.refreshState().subscribe({
      next: (state) => {
        if (state.shouldOffer) {
          this.asideService.show();
        }
      },
      error: () => {
        /* onboarding auto-open is best-effort */
      },
    });
  }

  canDeactivate(): boolean {
    return true;
  }
}
