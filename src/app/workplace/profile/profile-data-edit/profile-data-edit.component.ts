import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataManagementProfileService } from 'src/app/data/management/data-management-profile.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import {
  checkPasswordStrength,
  PasswordCheckStrength,
} from 'src/app/helpers/password';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-profile-data-edit',
  templateUrl: './profile-data-edit.component.html',
  styleUrls: ['./profile-data-edit.component.scss'],
})
export class ProfileDataEditComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  @ViewChild('clientForm', { static: false }) clientForm: NgForm | undefined;

  public newPassword1 = '';
  public passwordStrength = '';
  public passwordStrengthFlag = false;
  public showOldPassword = false;
  public faEye = faEye;
  public faEyeSlash = faEyeSlash;

  constructor(
    public dataManagementProfileService: DataManagementProfileService
  ) {
    this.readSignals();
  }

  ngOnInit(): void {
    this.dataManagementProfileService.isRead.set(true);
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

  private readSignals(): void {
    effect(
      () => {
        const isReset = this.dataManagementProfileService.isReset();
        if (isReset) {
          setTimeout(() => this.isChangingEvent.emit(false), 100);
          this.dataManagementProfileService.isReset.set(false);
        }
      },
      { allowSignalWrites: true }
    );
  }
}
