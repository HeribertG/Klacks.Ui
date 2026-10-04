// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EmbeddedViewRef, signal, ViewContainerRef, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { HarmonizerDialogComponent } from './harmonizer-dialog.component';
import { DataHarmonizerService } from 'src/app/infrastructure/api/harmonizer/data-harmonizer.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import {
  HarmonizerProgress,
  HarmonizerResult,
  HarmonizerStatus,
} from 'src/app/domain/models/harmonizer/harmonizer-progress.model';
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

function harmonizerResult(planningRuleWarnings?: ScheduleErrorEntry[] | null): HarmonizerResult {
  return {
    jobId: 'job-1',
    globalFitnessBefore: 0.5,
    globalFitnessAfter: 0.6,
    generationsRun: 3,
    rowResults: [],
    qualificationGaps: [],
    planningRuleWarnings,
  };
}

describe('HarmonizerDialogComponent', () => {
  let fixture: ComponentFixture<HarmonizerDialogComponent>;
  let component: HarmonizerDialogComponent;
  let harmonizerServiceMock: {
    progress: WritableSignal<HarmonizerProgress | null>;
    result: WritableSignal<HarmonizerResult | null>;
    status: WritableSignal<HarmonizerStatus>;
    failureReason: WritableSignal<string | null>;
    currentJobId: WritableSignal<string | null>;
  };

  beforeEach(async () => {
    harmonizerServiceMock = {
      progress: signal<HarmonizerProgress | null>(null),
      result: signal<HarmonizerResult | null>(null),
      status: signal<HarmonizerStatus>('idle'),
      failureReason: signal<string | null>(null),
      currentJobId: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [HarmonizerDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: signal([]) } },
        { provide: DataHarmonizerService, useValue: harmonizerServiceMock },
        { provide: DataManagementScheduleService, useValue: { clients: [], readDatas: vi.fn() } },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HarmonizerDialogComponent);
    component = fixture.componentInstance;
  });

  it('has no planning-rule warnings when the result carries none', () => {
    harmonizerServiceMock.result.set(harmonizerResult(null));
    expect(component.planningRuleWarnings()).toEqual([]);
  });

  it('exposes the remaining hard planning-rule counts of the run result', () => {
    expect(component.planningRuleRemaining()).toBeNull();
    harmonizerServiceMock.result.set({ ...harmonizerResult(null), planningRuleRemaining: { hardBefore: 2, hardAfter: 1 } });
    expect(component.planningRuleRemaining()).toEqual({ hardBefore: 2, hardAfter: 1 });
  });

  it('exposes the planning-rule warnings of the run result', () => {
    harmonizerServiceMock.result.set(harmonizerResult([planningRuleWarning]));
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
      harmonizerServiceMock.status.set('completed');
      harmonizerServiceMock.result.set(harmonizerResult([planningRuleWarning]));

      const line = renderModal().querySelector('.planning-rule-warning') as HTMLElement;

      expect(line).not.toBeNull();
      expect(line.textContent).toContain(INVALID_RULE_KEY);
      expect(line.getAttribute('title')).toBe(RULE_ID);
    });

    it('shows no planning-rule notice without warnings', () => {
      harmonizerServiceMock.status.set('completed');
      harmonizerServiceMock.result.set(harmonizerResult([]));

      expect(renderModal().querySelector('.planning-rule-warning-report')).toBeNull();
    });
  });
});
