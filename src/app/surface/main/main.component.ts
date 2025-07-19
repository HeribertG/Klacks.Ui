import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewContainerRef,
  ViewChild,
  OnChanges,
  inject,
  EnvironmentInjector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbsenceGanttHomeComponent } from '../../workplace/absence-gantt/absence-gantt-home/absence-gantt-home.component';
import { AllAddressHomeComponent } from 'src/app/workplace/address/all-address/all-address-home/all-address-home.component';
import { AllGroupHomeComponent } from 'src/app/workplace/group/all-group/all-group-home/all-group-home.component';
import { AllShiftHomeComponent } from '../../workplace/shift/all-shift/all-shift-home/all-shift-home.component';
import { CutShiftHomeComponent } from '../../workplace/shift/cut-shift/cut-shift-home/cut-shift-home.component';
import { DashboardHomeComponent } from 'src/app/workplace/dashboard/dashboard-home/dashboard-home.component';
import { EditAddressHomeComponent } from 'src/app/workplace/address/edit-address/edit-address-home/edit-address-home.component';
import { EditGroupHomeComponent } from 'src/app/workplace/group/edit-group/edit-group-home/edit-group-home.component';
import { EditShiftHomeComponent } from 'src/app/workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component';
import { ProfileHomeComponent } from 'src/app/workplace/profile/profile-home/profile-home.component';
import { ScheduleHomeComponent } from 'src/app/workplace/schedule/schedule-home/schedule-home.component';
import { SettingsHomeComponent } from 'src/app/workplace/settings/settings-home/settings-home.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [CommonModule, DashboardHomeComponent],
})
export class MainComponent implements OnChanges {
  // @Input() properties
  @Input() isAbsence = false;
  @Input() isClient = false;
  @Input() isCreateShift = false;
  @Input() isDashboard = false;
  @Input() isEditClient = false;
  @Input() isEditGroup = false;
  @Input() isGroup = false;
  @Input() isGroupStructure = false;
  @Input() isProfile = false;
  @Input() isSchedule = false;
  @Input() isSetting = false;
  @Input() isShift = false;
  @Input() isCutShift = false;

  // @Output() properties
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isEnterEvent = new EventEmitter();

  // @ViewChild properties
  @ViewChild('LazyLoadingPlaceholder', { read: ViewContainerRef, static: true })
  viewContainer!: ViewContainerRef;

  // Private injected services
  private environmentInjector = inject(EnvironmentInjector);

  // Public properties (used in templates)
  public compInstanceAbsenceGanttHome: AbsenceGanttHomeComponent | undefined;
  public compInstanceAllAddressHomeComponent: AllAddressHomeComponent | undefined;
  public compInstanceAllGroupHome: AllGroupHomeComponent | undefined;
  public compInstanceAllShiftHome: AllShiftHomeComponent | undefined;
  public compInstanceCutShiftHome: CutShiftHomeComponent | undefined;
  public compInstanceCreateShiftHome: EditShiftHomeComponent | undefined;
  public compInstanceEditAddressHomeComponent: EditAddressHomeComponent | undefined;
  public compInstanceEditGroupHome: EditGroupHomeComponent | undefined;
  public compInstanceProfileHome: ProfileHomeComponent | undefined;
  public compInstanceScheduleHome: ScheduleHomeComponent | undefined;
  public compInstanceSettingHome: SettingsHomeComponent | undefined;

  // Lifecycle hooks
  ngOnChanges(): void {
    if (this.isSetting && !this.compInstanceSettingHome) {
      import(
        '../../workplace/settings/settings-home/settings-home.component'
      ).then((m) => {
        const comp = m.SettingsHomeComponent;

        const compRef = this.viewContainer.createComponent(comp, {
          environmentInjector: this.environmentInjector,
        });

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

        const compRef = this.viewContainer.createComponent(comp, {
          environmentInjector: this.environmentInjector,
        });

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

    if (this.isShift && !this.compInstanceAllShiftHome) {
      import(
        '../../workplace/shift/all-shift/all-shift-home/all-shift-home.component'
      ).then((m) => {
        const comp = m.AllShiftHomeComponent;

        const compRef =
          this.viewContainer.createComponent<AllShiftHomeComponent>(comp);

        this.compInstanceAllShiftHome = compRef.instance;
        this.compInstanceAllShiftHome.isShift = this.isShift;

        compRef.instance.isChangingEvent.subscribe((event) => {
          this.isChangingEvent.emit(event);
        });
      });
    }

    if (this.isCutShift && !this.compInstanceCutShiftHome) {
      import(
        '../../workplace/shift/cut-shift/cut-shift-home/cut-shift-home.component'
      ).then((m) => {
        const comp = m.CutShiftHomeComponent;

        const compRef =
          this.viewContainer.createComponent<CutShiftHomeComponent>(comp);

        this.compInstanceCutShiftHome = compRef.instance;
        this.compInstanceCutShiftHome.isCutShift = this.isCutShift;

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

    if (this.compInstanceAllShiftHome) {
      this.compInstanceAllShiftHome.isShift = this.isShift;
    }

    if (this.compInstanceCutShiftHome) {
      this.compInstanceCutShiftHome.isCutShift = this.isCutShift;
    }
  }

  // Public methods
  onIsChanging(value: boolean | undefined): void {
    this.isChangingEvent.emit(value);
  }

  onIsEnter(): void {
    this.isEnterEvent.emit();
  }
}
