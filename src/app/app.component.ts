import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { ToastsContainerComponent } from './presentation/toast/toast.component';
import { KeyboardShortcutDirective } from './presentation/directives/keyboard-shortcut.directive';
import { AsideComponent } from './presentation/aside/aside.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,
    ToastsContainerComponent,
    KeyboardShortcutDirective,
    AsideComponent,
  ],
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  public title = 'klacks';

  ngOnInit(): void {
    // Initialize only basic settings that don't require authentication
    this.applicationInitService.initializeBasics();
  }
}
