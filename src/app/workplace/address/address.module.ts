import { LOCALE_ID, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllAddressHomeComponent } from './all-address/all-address-home/all-address-home.component';
import { AllAddressListComponent } from './all-address/all-address-list/all-address-list.component';
import { AllAddressNavComponent } from './all-address/all-address-nav/all-address-nav.component';
import { EditAddressHomeComponent } from './edit-address/edit-address-home/edit-address-home.component';
import { EditAddressNavComponent } from './edit-address/edit-address-nav/edit-address-nav.component';
import { AddressPersonaComponent } from './edit-address/address-persona/address-persona.component';
import { MembershipComponent } from './edit-address/membership/membership.component';
import { NoteComponent } from './edit-address/note/note.component';
import { IconsModule } from 'src/app/icons/icons.module';
import { NgbDateParserFormatter, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { FormsModule } from '@angular/forms';
import { AddressListComponent } from './edit-address/address-list/address-list.component';
import { NgbDateCustomParserFormatter } from 'src/app/helpers/NgbDateParserFormatter';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    AllAddressHomeComponent,
    AllAddressListComponent,
    AllAddressNavComponent,
    EditAddressHomeComponent,
    EditAddressNavComponent,
    AddressPersonaComponent,
    MembershipComponent,
    NoteComponent,
    AddressListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IconsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    TranslateModule,
    FontAwesomeModule,
  ],
  exports: [
    AllAddressHomeComponent,
    AllAddressListComponent,
    AllAddressNavComponent,
    EditAddressHomeComponent,
    EditAddressNavComponent,
    AddressPersonaComponent,
    MembershipComponent,
    NoteComponent,
    AddressListComponent,
  ],
  providers: [
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter },
    TranslateService,
  ],
})
export class AddressModule {}
