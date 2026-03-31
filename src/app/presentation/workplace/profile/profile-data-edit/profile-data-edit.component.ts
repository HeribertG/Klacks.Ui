// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  DoCheck,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

// Angular und Bibliotheksmodule
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';

// Anwendungsmodule
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

// Services und Utilities
import { DataManagementProfileService } from 'src/app/domain/services/schedule/data-management-profile.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  checkPasswordStrength,
  PasswordCheckStrength,
} from 'src/app/shared/helpers/password.helper';

@Component({
  selector: 'app-profile-data-edit',
  templateUrl: './profile-data-edit.component.html',
  styleUrls: ['./profile-data-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    SpinnerModule,
    TranslateModule,
    PasswordInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDataEditComponent implements OnInit, DoCheck {
  @Output() isChangingEvent = new EventEmitter();
  @ViewChild('clientForm', { static: false }) clientForm: NgForm | undefined;

  public newPassword1 = '';
  public passwordStrength = '';
  public passwordStrengthFlag = false;

  public dataManagementProfileService = inject(DataManagementProfileService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.setupResetSignalEffect();
  }

  ngOnInit(): void {
    this.dataManagementProfileService.isRead.set(true);
    setTimeout(() => {
      this.dataManagementProfileService.isRead.set(false);
      this.cdr.markForCheck();
    }, 100);
  }

  ngDoCheck(): void {
    if (
      this.dataManagementProfileService.changePasswordWrapper!.password ===
        '' &&
      this.dataManagementProfileService.changePasswordWrapper!.oldPassword ===
        ''
    ) {
      this.passwordStrength = '';
      this.passwordStrengthFlag = false;
      this.newPassword1 = '';
    }
  }

  onKeyUp(): void {
    if (
      this.dataManagementProfileService.changePasswordWrapper!.password !== ''
    ) {
      const res = checkPasswordStrength(
        this.dataManagementProfileService.changePasswordWrapper!.password
      );

      switch (res) {
        case PasswordCheckStrength.Short:
          this.passwordStrength = DomainMessages.PASSWORD_STRENGTH_SHORT;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Weak:
          this.passwordStrength = DomainMessages.PASSWORD_STRENGTH_WEAK;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Common:
          this.passwordStrength = DomainMessages.PASSWORD_STRENGTH_WEAK;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Ok:
          this.passwordStrength = DomainMessages.PASSWORD_STRENGTH_COMMON;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Strong:
          this.passwordStrength = DomainMessages.PASSWORD_STRENGTH_STRONG;
          this.passwordStrengthFlag = true;
          break;
      }
    }
  }

  onChange(): void {
    if (
      this.dataManagementProfileService.changePasswordWrapper!.password !==
        '' &&
      this.dataManagementProfileService.changePasswordWrapper!.password ===
        this.newPassword1 &&
      this.dataManagementProfileService.changePasswordWrapper!.oldPassword !==
        ''
    ) {
      if (this.passwordStrengthFlag) {
        this.dataManagementProfileService.passwordChangeIsAllowed(true);
      } else {
        this.dataManagementProfileService.passwordChangeIsAllowed(false);
      }
    }

    this.isChangingEvent.emit(true);
  }

  private setupResetSignalEffect(): void {
    effect(() => {
      const isReset = this.dataManagementProfileService.isReset();
      if (isReset) {
        setTimeout(() => this.isChangingEvent.emit(false), 100);
      }
    });
  }
}
