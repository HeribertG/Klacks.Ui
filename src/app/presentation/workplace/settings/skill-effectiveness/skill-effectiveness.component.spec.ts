// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SkillEffectivenessComponent } from './skill-effectiveness.component';
import { DataManagementSkillEffectivenessService } from 'src/app/domain/services/assistant/data-management-skill-effectiveness.service';
import { ISkillEffectivenessResource } from 'src/app/domain/interfaces/skill-effectiveness.interface';
import {
  SKILL_EFFECTIVENESS_DAY_OPTIONS,
  SKILL_EFFECTIVENESS_DEFAULT_DAYS,
} from 'src/app/domain/constants/skill-effectiveness.constants';

const RESOURCE: ISkillEffectivenessResource = {
  days: SKILL_EFFECTIVENESS_DEFAULT_DAYS,
  evalTrend: [
    {
      goldset: 'turn-selection-v1',
      model: 'deepseek-v4-pro',
      compositeScore: 0.4489,
      itemsTotal: 334,
      itemsPassed: 74,
      createTime: '2026-08-31T15:59:00Z',
    },
  ],
  recipeFunnel: [
    { recipeName: 'restore_email', started: 4, running: 1, completed: 2, aborted: 1, expired: 0 },
  ],
  failureSummary: {
    totalRows: 88,
    notFound: 11,
    permissionDenied: 2,
    parameterInvalid: 3,
    gateHold: 1,
    uiActionContext: 0,
    exception: 4,
    hallucinationRate: 0.125,
  },
  topSkills: [{ skillName: 'search_clients', calls: 20, successes: 19, failures: 1, successRate: 0.95 }],
  flopSkills: [{ skillName: 'create_branch', calls: 8, successes: 2, failures: 6, successRate: 0.25 }],
  chosenSourceDistribution: [{ source: 'knowledge_index', count: 42 }],
};

describe('SkillEffectivenessComponent', () => {
  let component: SkillEffectivenessComponent;
  let fixture: ComponentFixture<SkillEffectivenessComponent>;
  let getSkillEffectiveness: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getSkillEffectiveness = vi.fn(() => of(RESOURCE));

    await TestBed.configureTestingModule({
      imports: [SkillEffectivenessComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementSkillEffectivenessService, useValue: { getSkillEffectiveness } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillEffectivenessComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the default window on init', () => {
    fixture.detectChanges();

    expect(getSkillEffectiveness).toHaveBeenCalledWith(SKILL_EFFECTIVENESS_DEFAULT_DAYS);
    expect(component.selectedDays()).toBe(SKILL_EFFECTIVENESS_DEFAULT_DAYS);
    expect(component.data()).toEqual(RESOURCE);
    expect(component.isLoading()).toBe(false);
    expect(component.hasError()).toBe(false);
  });

  it('renders the key figures of every section', () => {
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('turn-selection-v1');
    expect(text).toContain('0.4489');
    expect(text).toContain('74/334');
    expect(text).toContain('restore_email');
    expect(text).toContain('search_clients');
    expect(text).toContain('create_branch');
    expect(text).toContain('knowledge_index');
    expect(text).toContain('12.5 %');
  });

  it('offers every day option and reloads on a new selection', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.day-range-btn');
    expect(buttons.length).toBe(SKILL_EFFECTIVENESS_DAY_OPTIONS.length);

    component.selectDays(SKILL_EFFECTIVENESS_DAY_OPTIONS[0]);

    expect(component.selectedDays()).toBe(SKILL_EFFECTIVENESS_DAY_OPTIONS[0]);
    expect(getSkillEffectiveness).toHaveBeenLastCalledWith(SKILL_EFFECTIVENESS_DAY_OPTIONS[0]);
  });

  it('ignores a click on the window that is already selected', () => {
    fixture.detectChanges();
    expect(getSkillEffectiveness).toHaveBeenCalledTimes(1);

    component.selectDays(SKILL_EFFECTIVENESS_DEFAULT_DAYS);

    expect(getSkillEffectiveness).toHaveBeenCalledTimes(1);
  });

  it('shows the error state when the request fails', () => {
    getSkillEffectiveness.mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.isLoading()).toBe(false);
    expect(component.data()).toBeNull();
  });

  it('formats percentages, scores and empty values', () => {
    expect(component.percent(0.955)).toBe('95.5 %');
    expect(component.score(0.44891)).toBe('0.4489');
    expect(component.date(null)).toBe('-');
    expect(component.model(null)).toBe('-');
  });

  it('uses translate keys instead of hardcoded German labels', () => {
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('setting.skill-effectiveness.headline');
    expect(text).toContain('setting.skill-effectiveness.recipe-funnel.headline');
    expect(text).not.toContain('Rezept-Funnel');
  });
});
