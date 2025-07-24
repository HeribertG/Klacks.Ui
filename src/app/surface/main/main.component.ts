/* eslint-disable @typescript-eslint/no-explicit-any */
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
  ComponentRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardHomeComponent } from 'src/app/workplace/dashboard/dashboard-home/dashboard-home.component';

interface ComponentConfig {
  importPath: () => Promise<any>;
  componentProperty: string;
  inputProperty: string;
  hasEventHandlers: boolean;
}

type RouteComponentMap = Record<string, ComponentConfig>;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [CommonModule, DashboardHomeComponent],
})
export class MainComponent implements OnChanges {
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

  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isEnterEvent = new EventEmitter();

  @ViewChild('LazyLoadingPlaceholder', { read: ViewContainerRef, static: true })
  viewContainer!: ViewContainerRef;

  private environmentInjector = inject(EnvironmentInjector);

  private componentInstances = new Map<string, ComponentRef<any>>();

  private readonly COMPONENT_MAP: RouteComponentMap = {
    isSetting: {
      importPath: () =>
        import(
          '../../workplace/settings/settings-home/settings-home.component'
        ),
      componentProperty: 'SettingsHomeComponent',
      inputProperty: 'isSetting',
      hasEventHandlers: true,
    },
    isProfile: {
      importPath: () =>
        import('../../workplace/profile/profile-home/profile-home.component'),
      componentProperty: 'ProfileHomeComponent',
      inputProperty: 'isProfile',
      hasEventHandlers: true,
    },
    isClient: {
      importPath: () =>
        import(
          '../../workplace/address/all-address/all-address-home/all-address-home.component'
        ),
      componentProperty: 'AllAddressHomeComponent',
      inputProperty: 'isClient',
      hasEventHandlers: true,
    },
    isEditClient: {
      importPath: () =>
        import(
          '../../workplace/address/edit-address/edit-address-home/edit-address-home.component'
        ),
      componentProperty: 'EditAddressHomeComponent',
      inputProperty: 'isEditClient',
      hasEventHandlers: true,
    },
    isAbsence: {
      importPath: () =>
        import(
          '../../workplace/absence-gantt/absence-gantt-home/absence-gantt-home.component'
        ),
      componentProperty: 'AbsenceGanttHomeComponent',
      inputProperty: 'isAbsence',
      hasEventHandlers: false,
    },
    isSchedule: {
      importPath: () =>
        import(
          '../../workplace/schedule/schedule-home/schedule-home.component'
        ),
      componentProperty: 'ScheduleHomeComponent',
      inputProperty: 'isSchedule',
      hasEventHandlers: false,
    },
    isGroup: {
      importPath: () =>
        import(
          '../../workplace/group/all-group/all-group-home/all-group-home.component'
        ),
      componentProperty: 'AllGroupHomeComponent',
      inputProperty: 'isGroup',
      hasEventHandlers: true,
    },
    isEditGroup: {
      importPath: () =>
        import(
          '../../workplace/group/edit-group/edit-group-home/edit-group-home.component'
        ),
      componentProperty: 'EditGroupHomeComponent',
      inputProperty: 'isEditGroup',
      hasEventHandlers: true,
    },
    isCreateShift: {
      importPath: () =>
        import(
          '../../workplace/shift/edit-shift/edit-shift-home/edit-shift-home.component'
        ),
      componentProperty: 'EditShiftHomeComponent',
      inputProperty: 'isCreateShift',
      hasEventHandlers: true,
    },
    isShift: {
      importPath: () =>
        import(
          '../../workplace/shift/all-shift/all-shift-home/all-shift-home.component'
        ),
      componentProperty: 'AllShiftHomeComponent',
      inputProperty: 'isShift',
      hasEventHandlers: true,
    },
    isCutShift: {
      importPath: () =>
        import(
          '../../workplace/shift/cut-shift/cut-shift-home/cut-shift-home.component'
        ),
      componentProperty: 'CutShiftHomeComponent',
      inputProperty: 'isCutShift',
      hasEventHandlers: true,
    },
  };

  async ngOnChanges(): Promise<void> {
    for (const [routeKey, config] of Object.entries(this.COMPONENT_MAP)) {
      const isActive = (this as any)[routeKey];

      if (isActive && !this.componentInstances.has(routeKey)) {
        await this.loadComponent(routeKey, config);
      }

      const componentRef = this.componentInstances.get(routeKey);
      if (componentRef) {
        (componentRef.instance as any)[config.inputProperty] = isActive;
      }
    }
  }

  private async loadComponent(
    routeKey: string,
    config: ComponentConfig
  ): Promise<void> {
    try {
      const module = await config.importPath();
      const componentType = module[config.componentProperty];

      const compRef = this.viewContainer.createComponent(componentType, {
        environmentInjector: this.environmentInjector,
      });

      (compRef.instance as any)[config.inputProperty] = (this as any)[routeKey];

      if (
        config.hasEventHandlers &&
        (compRef.instance as any).isChangingEvent
      ) {
        (compRef.instance as any).isChangingEvent.subscribe((event: any) => {
          this.isChangingEvent.emit(event);
        });
      }

      this.componentInstances.set(routeKey, compRef);
    } catch (error) {
      console.error(`Failed to load component for ${routeKey}:`, error);
    }
  }

  onIsChanging(value: boolean | undefined): void {
    this.isChangingEvent.emit(value);
  }

  onIsEnter(): void {
    this.isEnterEvent.emit();
  }
}
