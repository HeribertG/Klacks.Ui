// Copyright (c) Heribert Gasparoli Private. All rights reserved.

// Version: 1.0.1-deploy-test
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApplicationInitService } from 'src/app/application/services/application-init.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { ToastsContainerComponent } from './presentation/toast/toast.component';
import { KeyboardShortcutDirective } from './presentation/directives/keyboard-shortcut.directive';
import { AsideComponent } from './presentation/aside/aside.component';
import { TooltipComponent } from './presentation/shared/tooltip/tooltip.component';

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
    TooltipComponent,
  ],
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  private directionService = inject(DirectionService);
  public title = 'klacks';

  ngOnInit(): void {
    // Initialize only basic settings that don't require authentication
    this.applicationInitService.initializeBasics();
  }
}
