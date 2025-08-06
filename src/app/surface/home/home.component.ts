import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from 'src/app/modal/modal/modal.component';
import { SpinnerWrapperComponent } from 'src/app/spinner/spinner-wrapper/spinner-wrapper.component';
import { HeaderComponent } from '../header/header.component';
import { NavComponent } from '../nav/nav.component';
import { FooterComponent } from '../footer/footer.component';
import { MainComponent } from '../main/main.component';
import { SavebarComponent } from '../savebar/savebar.component';
import { ApplicationInitService } from 'src/app/services/application-init.service';
import { RouteName } from 'src/app/data/management/entity-names.enum';

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
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  private applicationInitService = inject(ApplicationInitService);

  ngOnInit(): void {
    // Initialize application resources after successful login
    this.applicationInitService.initialize();
  }

  ngOnDestroy(): void {
    // Cleaning up
    localStorage.removeItem(RouteName.EDIT_ADDRESS);
  }

  canDeactivate(): boolean {
    return true;
  }
}
