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
    if (this.isAbsence && !this.compInstanceAbsenceGanttHome) {
      import(
        '../../workplace/absence-gantt/absence-gantt-home/absence-gantt-home.component'
      ).then((m) => {
        const comp = m.AbsenceGanttHomeComponent;

        const compRef =
          this.viewContainer.createComponent<AbsenceGanttHomeComponent>(comp);

        this.compInstanceAbsenceGanttHome = compRef.instance;
        this.compInstanceAbsenceGanttHome.isAbsence = this.isAbsence;
      });
    }

    if (this.isSchedule && !this.compInstanceScheduleHome) {
      import(
        '../../workplace/schedule/schedule-home/schedule-home.component'
      ).then((m) => {
        const comp = m.ScheduleHomeComponent;

        const compRef =
          this.viewContainer.createComponent<ScheduleHomeComponent>(comp);

        this.compInstanceScheduleHome = compRef.instance;
        this.compInstanceScheduleHome.isSchedule = this.isSchedule;
      });
    }

    if (this.isGroup && !this.compInstanceAllGroupHome) {
      import(
        '../../workplace/group/all-group/all-group-home/all-group-home.component'
      ).then((m) => {
        const comp = m.AllGroupHomeComponent;

        const compRef =
          this.viewContainer.createComponent<AllGroupHomeComponent>(comp);

        this.compInstanceAllGroupHome = compRef.instance;
        this.compInstanceAllGroupHome.isGroup = this.isGroup;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.isEditGroup && !this.compInstanceEditGroupHome) {
      import(
        '../../workplace/group/edit-group/edit-group-home/edit-group-home.component'
      ).then((m) => {
        const comp = m.EditGroupHomeComponent;

        const compRef =
          this.viewContainer.createComponent<EditGroupHomeComponent>(comp);

        this.compInstanceEditGroupHome = compRef.instance;
        this.compInstanceEditGroupHome.isEditGroup = this.isEditGroup;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }
    if (this.isCreateShift && !this.compInstanceCreateShiftHome) {
      import(
        '../../workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component'
      ).then((m) => {
        const comp = m.EditShiftHomeComponent;

        const compRef =
          this.viewContainer.createComponent<EditShiftHomeComponent>(comp);

        this.compInstanceCreateShiftHome = compRef.instance;
        this.compInstanceCreateShiftHome.isCreateShift = this.isCreateShift;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.compInstanceAbsenceGanttHome) {
      this.compInstanceAbsenceGanttHome.isAbsence = this.isAbsence;
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

    if (this.compInstanceScheduleHome) {
      this.compInstanceScheduleHome.isSchedule = this.isSchedule;
    }

    if (this.compInstanceAllGroupHome) {
      this.compInstanceAllGroupHome.isGroup = this.isGroup;
    }

    if (this.compInstanceEditGroupHome) {
      this.compInstanceEditGroupHome.isEditGroup = this.isEditGroup;
    }

    if (this.compInstanceCreateShiftHome) {
      this.compInstanceCreateShiftHome.isCreateShift = this.isCreateShift;
    }
  }

  onIsChanging(value: boolean | undefined): void {
    this.isChangingEvent.emit(value);
  }

  onIsEnter(): void {
    this.isEnterEvent.emit();
  }
}
