import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ModalComponent } from 'src/app/presentation/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/presentation/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { MainComponent } from '../main/main.component';
import { SavebarComponent } from '../savebar/savebar.component';
import { AsideComponent } from 'src/app/presentation/aside/aside.component';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';

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
    SavebarComponent,
    FooterComponent,
    AsideComponent,
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  private applicationInitService = inject(ApplicationInitService);
  private asideService = inject(AsideService);
  private destroy$ = new Subject<void>();
  
  asideVisible = false;

  constructor() {
    this.asideService.isVisible
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        console.log('HomeComponent: aside visibility:', visible);
        this.asideVisible = visible;
        // Set CSS variable for the aside width
        document.documentElement.style.setProperty('--aside-width', visible ? '450px' : '0px');
      });
  }

  ngOnInit(): void {
    // Initialize application resources after successful login
    this.applicationInitService.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canDeactivate(): boolean {
    return true;
  }
}
