import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllGroupHomeComponent } from './all-group/all-group-home/all-group-home.component';
import { AllGroupListComponent } from './all-group/all-group-list/all-group-list.component';
import { AllGroupNavComponent } from './all-group/all-group-nav/all-group-nav.component';
import { EditGroupHomeComponent } from './edit-group/edit-group-home/edit-group-home.component';
import { EditGroupItemComponent } from './edit-group/edit-group-item/edit-group-item.component';
import { EditGroupNavComponent } from './edit-group/edit-group-nav/edit-group-nav.component';
import { TranslateModule } from '@ngx-translate/core';
import { ToastModule } from 'src/app/toast/toast.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { FormsModule } from '@angular/forms';
import { EditGroupMembersComponent } from './edit-group/edit-group-members/edit-group-members.component';

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
    IconsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    ToastModule,
    TranslateModule,
  ],
})
export class GroupModule {}
