import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllGroupHomeComponent } from './all-group/all-group-home/all-group-home.component';
import { AllGroupListComponent } from './all-group/all-group-list/all-group-list.component';
import { AllGroupNavComponent } from './all-group/all-group-nav/all-group-nav.component';
import { EditGroupHomeComponent } from './edit-group/edit-group-home/edit-group-home.component';
import { EditGroupItemComponent } from './edit-group/edit-group-item/edit-group-item.component';
import { EditGroupNavComponent } from './edit-group/edit-group-nav/edit-group-nav.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { EditGroupMembersComponent } from './edit-group/edit-group-members/edit-group-members.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { CalendarIconComponent } from 'src/app/icons/calendar-icon.component';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';

@NgModule({
  declarations: [
    AllGroupHomeComponent,
    AllGroupListComponent,
    AllGroupNavComponent,
    EditGroupHomeComponent,
    EditGroupItemComponent,
    EditGroupNavComponent,
    EditGroupMembersComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    TranslateModule,
    FontAwesomeModule,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    IconCopyGreyComponent,
    CalendarIconComponent,
    ChooseCalendarComponent,
  ],
})
export class GroupModule {}
