import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-no-access',
  templateUrl: './no-access.component.html',
  styleUrl: './no-access.component.scss',
  imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
  standalone: true,
})
export class NoAccessComponent {
  public translate = inject(TranslateService);
  private navigationService = inject(NavigationService);

  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}
