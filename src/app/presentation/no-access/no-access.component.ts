
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-no-access',
  templateUrl: './no-access.component.html',
  styleUrl: './no-access.component.scss',
  imports: [FormsModule, TranslateModule, RouterModule],
  standalone: true,
})
export class NoAccessComponent {
  // Public injected services
  public translate = inject(TranslateService);

  // Private injected services
  private navigationService = inject(NavigationService);

  // Public methods
  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}
