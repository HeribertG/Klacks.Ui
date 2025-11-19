
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss',
  imports: [FormsModule, TranslateModule, RouterModule],
  standalone: true,
})
export class PageNotFoundComponent {
  // Public injected services
  public translate = inject(TranslateService);

  // Private injected services
  private navigationService = inject(NavigationService);

  // Public methods
  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}