import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-group-scope-header',
  imports: [],
  templateUrl: './group-scope-header.component.html',
  styleUrl: './group-scope-header.component.scss',
  standalone: true,
})
export class GroupScopeHeaderComponent {
  public translate = inject(TranslateService);
}
