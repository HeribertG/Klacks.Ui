// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EmbeddedViewRef, signal, ViewContainerRef, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { HolisticHarmonizerDialogComponent } from './holistic-harmonizer-dialog.component';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { HOLISTIC_HARMONIZER_MODE } from 'src/app/domain/constants/holistic-harmonizer-mode.constants';
import {
  HolisticHarmonizerProgress,
  HolisticHarmonizerRunResponse,
  HolisticHarmonizerStatus,
} from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { CollisionDetectionService } from 'src/app/domain/services/schedule/collision-detection.service';

const RULE_ID = 'rule-invalid-1';
const INVALID_RULE_KEY = 'schedule.error-list.planning-rule-invalid';

const planningRuleWarning: ScheduleErrorEntry = {
  type: 'warning',
  clientId: '00000000-0000-0000-0000-000000000000',
  clientName: '',
  date: '2026-10-01',
  comment: INVALID_RULE_KEY,
  commentParams: { ruleId: RULE_ID },
};

function runResponse(planningRuleWarnings?: ScheduleErrorEntry[] | null): HolisticHarmonizerRunResponse {
  return {
    jobId: 'job-1',
    llmModelId: '',
    fitnessBefore: 0.5,
    fitnessAfter: 0.6,
    acceptedSwaps: [],
    rejectedSwaps: [],
    batches: [],
    agentDisplayNames: [],
    qualificationGaps: [],
    llmParsingError: null,
    llmRawResponsePreview: null,
    planningRuleWarnings,
  };
}

describe('HolisticHarmonizerDialogComponent', () => {
  let fixture: ComponentFixture<HolisticHarmonizerDialogComponent>;
  let component: HolisticHarmonizerDialogComponent;
  let serviceMock: {
    progress: WritableSignal<HolisticHarmonizerProgress | null>;
    result: WritableSignal<HolisticHarmonizerRunResponse | null>;
    status: WritableSignal<HolisticHarmonizerStatus>;
    failureReason: WritableSignal<string | null>;
    currentJobId: WritableSignal<string | null>;
  };

  beforeEach(async () => {
    serviceMock = {
      progress: signal<HolisticHarmonizerProgress | null>(null),
      result: signal<HolisticHarmonizerRunResponse | null>(null),
      status: signal<HolisticHarmonizerStatus>('idle'),
      failureReason: signal<string | null>(null),
      currentJobId: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [HolisticHarmonizerDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
        { provide: DataHolisticHarmonizerService, useValue: serviceMock },
        { provide: DataManagementScheduleService, useValue: { clients: [], readDatas: vi.fn() } },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } },
        {
          provide: AppSettingsManagementService,
          useValue: {
            holisticHarmonizerSettings: signal({ llmModelId: '', mode: HOLISTIC_HARMONIZER_MODE.deterministic }),
          },
        },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HolisticHarmonizerDialogComponent);
    component = fixture.componentInstance;
  });

  it('has no planning-rule warnings when the run response carries none', () => {
    serviceMock.result.set(runResponse(undefined));
    expect(component.planningRuleWarnings()).toEqual([]);
  });

  it('exposes the remaining hard planning-rule counts of the run response', () => {
    expect(component.planningRuleRemaining()).toBeNull();
    serviceMock.result.set({ ...runResponse(null), planningRuleRemaining: { hardBefore: 4, hardAfter: 4 } });
    expect(component.planningRuleRemaining()).toEqual({ hardBefore: 4, hardAfter: 4 });
  });

  it('exposes the planning-rule warnings of the run response', () => {
    serviceMock.result.set(runResponse([planningRuleWarning]));
    expect(component.planningRuleWarnings()).toEqual([planningRuleWarning]);
  });

  describe('rendered result', () => {
    let modalView: EmbeddedViewRef<unknown>;

    function renderModal(): HTMLElement {
      fixture.detectChanges();
      const viewContainer = fixture.debugElement.injector.get(ViewContainerRef);
      modalView = viewContainer.createEmbeddedView(component.modalTemplate(), {
        $implicit: { close: () => undefined, dismiss: () => undefined },
      });
      fixture.detectChanges();
      const host = document.createElement('div');
      for (const node of modalView.rootNodes as Node[]) host.appendChild(node.cloneNode(true));
      return host;
    }

    afterEach(() => modalView?.destroy());

    it('shows the skipped planning rule with its rule id as tooltip once the run is done', () => {
      serviceMock.status.set('completed');
      serviceMock.result.set(runResponse([planningRuleWarning]));

      const line = renderModal().querySelector('.planning-rule-warning') as HTMLElement;

      expect(line).not.toBeNull();
      expect(line.textContent).toContain(INVALID_RULE_KEY);
      expect(line.getAttribute('title')).toBe(RULE_ID);
    });

    it('shows no planning-rule notice without warnings', () => {
      serviceMock.status.set('completed');
      serviceMock.result.set(runResponse(null));

      expect(renderModal().querySelector('.planning-rule-warning-report')).toBeNull();
    });
  });
});
