import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  DoCheck,
} from '@angular/core';

// Angular und Bibliotheksmodule
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// Anwendungsmodule
import { SpinnerModule } from 'src/app/spinner/spinner.module';

// Services und Utilities
import { DataManagementProfileService } from 'src/app/data/management/data-management-profile.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import {
  checkPasswordStrength,
  PasswordCheckStrength,
} from 'src/app/helpers/password';

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
    FontAwesomeModule,
  ],
})
export class ProfileDataEditComponent implements OnInit, DoCheck {
  @Output() isChangingEvent = new EventEmitter();
  @ViewChild('clientForm', { static: false }) clientForm: NgForm | undefined;

  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public newPassword1 = '';
  public passwordStrength = '';
  public passwordStrengthFlag = false;
  public showOldPassword = false;

  public translate = inject(TranslateService);
  public dataManagementProfileService = inject(DataManagementProfileService);

  constructor() {
    this.setupResetSignalEffect();
  }

  ngOnInit(): void {
    this.dataManagementProfileService.isRead.set(true);
    setTimeout(() => this.dataManagementProfileService.isRead.set(false), 100);
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
          this.passwordStrength = MessageLibrary.PASSWORD_STRENGTH_SHORT;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Weak:
          this.passwordStrength = MessageLibrary.PASSWORD_STRENGTH_WEAK;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Common:
          this.passwordStrength = MessageLibrary.PASSWORD_STRENGTH_WEAK;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Ok:
          this.passwordStrength = MessageLibrary.PASSWORD_STRENGTH_COMMON;
          this.passwordStrengthFlag = false;
          break;
        case PasswordCheckStrength.Strong:
          this.passwordStrength = MessageLibrary.PASSWORD_STRENGTH_STRONG;
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
