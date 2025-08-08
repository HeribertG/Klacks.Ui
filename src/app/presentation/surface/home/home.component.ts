import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
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
export class HomeComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);

  ngOnInit(): void {
    // Initialize application resources after successful login
    this.applicationInitService.initialize();
  }

  canDeactivate(): boolean {
    return true;
  }
}
