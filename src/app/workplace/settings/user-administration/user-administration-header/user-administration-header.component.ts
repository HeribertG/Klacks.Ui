import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-user-administration-header',
  templateUrl: './user-administration-header.component.html',
  styleUrls: ['./user-administration-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, NgbModule],
})
export class UserAdministrationHeaderComponent {
  public translate = inject(TranslateService);
}
