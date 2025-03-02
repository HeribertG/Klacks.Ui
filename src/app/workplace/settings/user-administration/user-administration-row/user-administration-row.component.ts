import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';

import { IAuthentication } from 'src/app/core/authentification-class';

@Component({
  selector: 'app-user-administration-row',
  templateUrl: './user-administration-row.component.html',
  styleUrls: ['./user-administration-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    IconsModule,
    SharedModule,
  ],
})
export class UserAdministrationRowComponent {
  @Input() user: IAuthentication | undefined;
  @Input() enabled: boolean | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() isChangingEvent = new EventEmitter<void>();
  @Output() isSentToEvent = new EventEmitter<string>();

  public translate = inject(TranslateService);

  onDelete(): void {
    this.isDeleteEvent.emit();
  }

  onChange(): void {
    if (this.user) {
      this.user.isAdmin = Boolean(this.user.isAdmin?.toString() === 'true');
      this.user.isAuthorised = Boolean(
        this.user.isAuthorised?.toString() === 'true'
      );
      this.isChangingEvent.emit();
    }
  }

  onClickSentTo(): void {
    if (this.user?.email) {
      this.isSentToEvent.emit(this.user.email);
    }
  }
}
