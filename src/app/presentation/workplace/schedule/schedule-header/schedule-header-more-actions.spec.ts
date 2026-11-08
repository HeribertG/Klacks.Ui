// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbDropdownModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DirectionService } from 'src/app/application/services/direction.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { ScheduleSelectionService } from '../services/schedule-selection.service';
import { ScheduleTimelineRangeService } from '../services/schedule-timeline-range.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { ScheduleHeaderComponent } from './schedule-header.component';
import { ScheduleHeaderPeriodNavigationService } from './services/schedule-header-period-navigation.service';
import { ScheduleHeaderRecalculationService } from './services/schedule-header-recalculation.service';
import { ScheduleHeaderBulkSendService } from './services/schedule-header-bulk-send.service';
import { ScheduleHeaderWizardMenuService } from './services/schedule-header-wizard-menu.service';
import { ScheduleHeaderToolsOverlayService } from './services/schedule-header-tools-overlay.service';
import { ScheduleHeaderDisplayTogglesService } from './services/schedule-header-display-toggles.service';

@Component({ selector: 'app-stand-in-create-dialog', template: '', standalone: true })
class StandInDialogStubComponent {
  open = vi.fn();
}

@Component({ selector: 'app-scenario-variants-dialog', template: '', standalone: true })
class VariantsDialogStubComponent {
  open = vi.fn();
}

const SELECTED_GROUP = Object.assign(new Group(), { id: 'group-1', name: 'Bern Objektschutz' });
const PERIOD_START = new Date(Date.UTC(2026, 9, 1));
const PERIOD_END = new Date(Date.UTC(2026, 9, 31));

const MORE_BUTTON = '#schedule-more-actions-btn';
const STAND_IN_ITEM = '#schedule-more-create-stand-ins';
const KEYS_ITEM = '#schedule-more-manage-keys';
const OLD_STAND_IN_BUTTON = '#schedule-create-stand-ins-btn';

describe('ScheduleHeaderComponent - more actions menu (real template)', () => {
  let granted: WritableSignal<string[]>;
  let readDatas: ReturnType<typeof vi.fn>;
  let selectedGroup: WritableSignal<Group | undefined>;
  let fixture: ComponentFixture<ScheduleHeaderComponent>;

  const holds = (permission: string): boolean => granted().includes(ROLE_ADMIN) || granted().includes(permission);

  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ScheduleHeaderComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const find = (host: HTMLElement, selector: string): HTMLElement | null => host.querySelector<HTMLElement>(selector);

  const dialogStub = <T>(type: new () => T): T => fixture.debugElement.query((node) => node.componentInstance instanceof type).componentInstance as T;

  beforeEach(() => {
    granted = signal<string[]>([]);
    readDatas = vi.fn();
    selectedGroup = signal<Group | undefined>(SELECTED_GROUP);

    TestBed.configureTestingModule({
      imports: [ScheduleHeaderComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => holds(permission) } },
        { provide: ScenarioVariantService, useValue: { canManage: computed(() => holds(PERMISSIONS.CanEditShifts)) } },
        {
          provide: GroupSelectionService,
          useValue: {
            get selectedGroup(): Group | undefined {
              return selectedGroup();
            },
          },
        },
        {
          provide: DataManagementScheduleService,
          useValue: {
            workFilter: { selectedGroup: SELECTED_GROUP.id },
            periodStartDate: PERIOD_START,
            periodEndDate: PERIOD_END,
            readDatas,
          },
        },
        {
          provide: ScheduleViewModeService,
          useValue: { isTimelineMode: signal(false), timelineRowHeightFactor: signal(1), setViewMode: vi.fn() },
        },
        { provide: ScheduleTimelineRangeService, useValue: { viewRange: signal('full'), setViewRange: vi.fn() } },
        { provide: ScheduleSelectionService, useValue: { selectedWork: signal(null) } },
      ],
    });
    TestBed.overrideComponent(ScheduleHeaderComponent, {
      set: {
        imports: [NgbDropdownModule, NgbTooltip, TranslateModule, StandInDialogStubComponent, VariantsDialogStubComponent],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          {
            provide: ScheduleHeaderPeriodNavigationService,
            useValue: {
              displayPeriod: 'Oct',
              displayYear: 2026,
              paymentInterval: PaymentInterval.Monthly,
              currentYear: 2026,
              selectedWeek: 40,
              selectedMonth: 10,
              goToNext: vi.fn(),
              goToPrevious: vi.fn(),
              onCalendarReset: vi.fn(),
            },
          },
          {
            provide: ScheduleHeaderRecalculationService,
            useValue: {
              connect: vi.fn(),
              canRecalculate: () => true,
              canRecalculateAllUnsealed: () => false,
              isRecalculating: () => false,
            },
          },
          {
            provide: ScheduleHeaderBulkSendService,
            useValue: { isEmailConfigured: () => false, isSendDisabled: () => true, isSending: () => false },
          },
          {
            provide: ScheduleHeaderWizardMenuService,
            useValue: {
              showsWizardDropdown: () => false,
              showsAutofillButton: () => false,
              canCoverAbsence: () => false,
              isAutoWizardRunningForCurrentView: () => false,
              onShortcutKeydown: vi.fn(),
            },
          },
          {
            provide: ScheduleHeaderToolsOverlayService,
            useValue: { toolsOpen: () => false, onDocumentClickCloseTools: vi.fn(), onEscapeCloseTools: vi.fn() },
          },
          {
            provide: ScheduleHeaderDisplayTogglesService,
            useValue: { colourIcons: vi.fn(), hasAvailabilityData: () => false },
          },
        ],
      },
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows an admin the menu with both entries, right after the recalculation', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);

    // Act
    const host = render();

    // Assert
    const more = find(host, MORE_BUTTON)!;
    expect(more).not.toBeNull();
    expect(more.getAttribute('aria-label')).toBe('schedule.toolbar.more-actions');
    expect(find(host, STAND_IN_ITEM)?.textContent).toContain('standIn.create.title');
    expect(find(host, KEYS_ITEM)?.textContent).toContain('scenarioVariant.menu');
    expect(find(host, '.recalculate-dropdown')!.nextElementSibling).toBe(find(host, '.more-actions-dropdown'));
  });

  it('shows only the placeholder entry to whoever may create clients but not edit shifts', () => {
    // Arrange
    granted.set([PERMISSIONS.CanCreateClients]);

    // Act
    const host = render();

    // Assert
    expect(find(host, MORE_BUTTON)).not.toBeNull();
    expect(find(host, STAND_IN_ITEM)).not.toBeNull();
    expect(find(host, KEYS_ITEM)).toBeNull();
  });

  it('shows only the keys entry to whoever may edit shifts but not create clients', () => {
    // Arrange
    granted.set([PERMISSIONS.CanEditShifts]);

    // Act
    const host = render();

    // Assert
    expect(find(host, MORE_BUTTON)).not.toBeNull();
    expect(find(host, STAND_IN_ITEM)).toBeNull();
    expect(find(host, KEYS_ITEM)).not.toBeNull();
  });

  it('hides the menu and both dialogs from a planner without a role, never showing an empty menu', () => {
    // Arrange
    granted.set([PERMISSIONS.CanEditSchedule]);

    // Act
    const host = render();

    // Assert
    expect(find(host, MORE_BUTTON)).toBeNull();
    expect(find(host, '.more-actions-dropdown')).toBeNull();
    expect(find(host, 'app-stand-in-create-dialog')).toBeNull();
    expect(find(host, 'app-scenario-variants-dialog')).toBeNull();
  });

  it('no longer has its own placeholder button in the toolbar', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);

    // Act
    const host = render();

    // Assert
    expect(find(host, OLD_STAND_IN_BUTTON)).toBeNull();
  });

  it('opens the placeholder dialog with the selected group and the shown period, and reloads after creation', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);
    const host = render();
    const standInDialog = dialogStub(StandInDialogStubComponent);

    // Act
    find(host, STAND_IN_ITEM)!.click();
    fixture.componentInstance.onStandInsCreated();

    // Assert
    expect(standInDialog.open).toHaveBeenCalledWith({
      groupId: 'group-1',
      groupName: 'Bern Objektschutz',
      validFrom: PERIOD_START,
      validUntil: PERIOD_END,
    });
    expect(readDatas).toHaveBeenCalledWith(false);
  });

  it('opens the key management from the keys entry', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);
    const host = render();
    const variantsDialog = dialogStub(VariantsDialogStubComponent);

    // Act
    find(host, KEYS_ITEM)!.click();

    // Assert
    expect(variantsDialog.open).toHaveBeenCalledTimes(1);
  });

  it('disables both entries and explains why while no single group is selected, opening no dialog', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);
    selectedGroup.set(undefined);
    const host = render();
    const standInDialog = dialogStub(StandInDialogStubComponent);
    const variantsDialog = dialogStub(VariantsDialogStubComponent);
    const standInItem = find(host, STAND_IN_ITEM) as HTMLButtonElement;
    const keysItem = find(host, KEYS_ITEM) as HTMLButtonElement;

    // Act
    fixture.componentInstance.onCreateStandInsClick();
    fixture.componentInstance.onManageKeysClick();

    // Assert
    expect(standInItem.disabled).toBe(true);
    expect(keysItem.disabled).toBe(true);
    expect(find(host, '#schedule-more-needs-group')?.textContent).toContain('schedule.toolbar.needsGroup');
    expect(standInDialog.open).not.toHaveBeenCalled();
    expect(variantsDialog.open).not.toHaveBeenCalled();
  });

  it('enables both entries once a group is selected', () => {
    // Arrange
    granted.set([ROLE_ADMIN]);

    // Act
    const host = render();

    // Assert
    expect((find(host, STAND_IN_ITEM) as HTMLButtonElement).disabled).toBe(false);
    expect((find(host, KEYS_ITEM) as HTMLButtonElement).disabled).toBe(false);
    expect(find(host, '#schedule-more-needs-group')).toBeNull();
  });

  it('opens the menu with the keyboard and closes it with escape', async () => {
    // Arrange
    granted.set([ROLE_ADMIN]);
    const host = render();
    const more = find(host, MORE_BUTTON)!;
    const menu = find(host, '.more-actions-dropdown [ngbDropdownMenu]')!;
    const settle = async (): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    // Act
    more.focus();
    more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle();
    const openedByKeyboard = menu.classList.contains('show');
    more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    // Assert
    expect(openedByKeyboard).toBe(true);
    expect(menu.classList.contains('show')).toBe(false);
  });
});
