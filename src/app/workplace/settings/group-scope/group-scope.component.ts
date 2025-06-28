import { Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { GroupScopeHeaderComponent } from './group-scope-header/group-scope-header.component';
import { GroupScopeRowComponent } from './group-scope-row/group-scope-row.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-group-scope',
  templateUrl: './group-scope.component.html',
  styleUrl: './group-scope.component.scss',
  standalone: true,
  imports: [GroupScopeRowComponent, GroupScopeHeaderComponent, NgbModule],
})
export class GroupScopeComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public translate = inject(TranslateService);
  public dataManagementGroupService = inject(DataManagementGroupService);

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }
}
