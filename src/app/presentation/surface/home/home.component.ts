// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnInit, OnDestroy, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { ModalComponent } from 'src/app/presentation/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/presentation/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { MainComponent } from '../main/main.component';
import { SavebarComponent } from '../savebar/savebar.component';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';

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
    FooterComponent
],
})
export class HomeComponent implements OnInit, OnDestroy {
  private applicationInitService = inject(ApplicationInitService);
  private destroy$ = new Subject<void>();

  constructor() {}

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
