import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileHomeComponent } from './profile-home/profile-home.component';
import { ProfileDataEditComponent } from './profile-data-edit/profile-data-edit.component';
import { ProfilePictureComponent } from './profile-picture/profile-picture.component';
import { ProfileCustomSettingComponent } from './profile-custom-setting/profile-custom-setting.component';
import { FormsModule } from '@angular/forms';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { RouterModule } from '@angular/router';
import { IconsModule } from 'src/app/icons/icons.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    ProfileHomeComponent,
    ProfileDataEditComponent,
    ProfilePictureComponent,
    ProfileCustomSettingComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FormsModule,
    NgbModule,
    IconsModule,
    SharedModule,
    SpinnerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
  exports: [
    ProfileHomeComponent,
    ProfileDataEditComponent,
    ProfilePictureComponent,
    ProfileCustomSettingComponent,
  ],
})
export class ProfileModule {}
