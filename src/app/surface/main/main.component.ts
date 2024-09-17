import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewContainerRef,
  ViewChild,
  OnChanges,
} from '@angular/core';
import { AllAddressHomeComponent } from '../../workplace/address/all-address/all-address-home/all-address-home.component';
import { EditAddressHomeComponent } from '../../workplace/address/edit-address/edit-address-home/edit-address-home.component';
import { SettingsHomeComponent } from '../../workplace/settings/settings-home/settings-home.component';
import { ProfileHomeComponent } from '../../workplace/profile/profile-home/profile-home.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnChanges {
  @ViewChild('LazyLoadingPlaceholder', { read: ViewContainerRef, static: true })
  viewContainer!: ViewContainerRef;

  @Input() isDashboard: boolean = false;
  @Input() isProfile: boolean = false;
  @Input() isClient: boolean = false;
  @Input() isEditClient: boolean = false;
  @Input() isSetting: boolean = false;
  @Input() isAbsence: boolean = false;
  @Input() isSchedule: boolean = false;
  @Input() isGroup: boolean = false;
  @Input() isEditGroup: boolean = false;
  @Input() isCreateShift: boolean = false;

  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isEnterEvent = new EventEmitter();

  compInstanceProfileHome: ProfileHomeComponent | undefined;
  compInstanceAllAddressHomeComponent: AllAddressHomeComponent | undefined;
  compInstanceEditAddressHomeComponent: EditAddressHomeComponent | undefined;
  compInstanceSettingHome: SettingsHomeComponent | undefined;
  // compInstanceAbsenceGanttHome: AbsenceGanttHomeComponent | undefined;
  // compInstanceScheduleHome: ScheduleHomeComponent | undefined;
  // compInstanceAllGroupHome: AllGroupHomeComponent | undefined;
  // compInstanceEditGroupHome: EditGroupHomeComponent | undefined;
  // compInstanceCreateShiftHome: EditShiftHomeComponent | undefined;

  ngOnChanges(changes: any): void {
    if (this.isSetting && !this.compInstanceSettingHome) {
      import(
        '../../workplace/settings/settings-home/settings-home.component'
      ).then((m) => {
        const comp = m.SettingsHomeComponent;

        const compRef =
          this.viewContainer.createComponent<SettingsHomeComponent>(comp);

        this.compInstanceSettingHome = compRef.instance;
        this.compInstanceSettingHome.isSetting = this.isSetting;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }
    if (this.isProfile && !this.compInstanceProfileHome) {
      import(
        '../../workplace/profile/profile-home/profile-home.component'
      ).then((m) => {
        const comp = m.ProfileHomeComponent;

        const compRef =
          this.viewContainer.createComponent<ProfileHomeComponent>(comp);

        this.compInstanceProfileHome = compRef.instance;
        this.compInstanceProfileHome.isProfile = this.isProfile;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.isClient && !this.compInstanceAllAddressHomeComponent) {
      import(
        '../../workplace/address/all-address/all-address-home/all-address-home.component'
      ).then((m) => {
        const comp = m.AllAddressHomeComponent;

        const compRef =
          this.viewContainer.createComponent<AllAddressHomeComponent>(comp);

        this.compInstanceAllAddressHomeComponent = compRef.instance;
        this.compInstanceAllAddressHomeComponent.isClient = this.isClient;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.isEditClient && !this.compInstanceEditAddressHomeComponent) {
      import(
        '../../workplace/address/edit-address/edit-address-home/edit-address-home.component'
      ).then((m) => {
        const comp = m.EditAddressHomeComponent;

        const compRef =
          this.viewContainer.createComponent<EditAddressHomeComponent>(comp);

        this.compInstanceEditAddressHomeComponent = compRef.instance;
        this.compInstanceEditAddressHomeComponent.isEditClient =
          this.isEditClient;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.compInstanceAllAddressHomeComponent) {
      this.compInstanceAllAddressHomeComponent.isClient = this.isClient;
    }
    if (this.compInstanceSettingHome) {
      this.compInstanceSettingHome.isSetting = this.isSetting;
    }
    if (this.compInstanceEditAddressHomeComponent) {
      this.compInstanceEditAddressHomeComponent.isEditClient =
        this.isEditClient;
    }
    if (this.compInstanceProfileHome) {
      this.compInstanceProfileHome.isProfile = this.isProfile;
    }
  }

  onIsChanging(value: boolean | undefined): void {
    this.isChangingEvent.emit(value);
  }

  onIsEnter(): void {
    this.isEnterEvent.emit();
  }
}
