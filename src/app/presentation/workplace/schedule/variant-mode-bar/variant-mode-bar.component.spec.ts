// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { VariantModeBarComponent } from './variant-mode-bar.component';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';

describe('VariantModeBarComponent', () => {
  const variant: IScenarioVariant = {
    id: 'variant-1',
    name: 'Winter key',
    groupId: 'group-1',
    fromDate: '2026-11-02',
    untilDate: '2026-11-29',
    token: 'variant-token-1',
    status: AnalyseScenarioStatus.Active,
    isExpired: false,
    shiftCount: 3,
  };

  let activeVariant: WritableSignal<IScenarioVariant | null>;
  let leave: ReturnType<typeof vi.fn>;

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(VariantModeBarComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    activeVariant = signal<IScenarioVariant | null>(variant);
    leave = vi.fn();
    TestBed.configureTestingModule({
      imports: [VariantModeBarComponent, TranslateModule.forRoot()],
      providers: [{ provide: ScenarioVariantService, useValue: { activeVariant, leave } }],
    });
  });

  it('names the key being edited', () => {
    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#variant-mode-bar')).not.toBeNull();
    expect(host.querySelector('#variant-mode-bar-name')?.textContent).toContain('Winter key');
    expect(host.textContent).toContain('scenarioVariant.bar.label');
  });

  it('renders nothing outside variant mode', () => {
    // Arrange
    activeVariant.set(null);

    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#variant-mode-bar')).toBeNull();
  });

  it('ends variant mode with the end button', () => {
    // Arrange
    const host = render();

    // Act
    host.querySelector<HTMLButtonElement>('#variant-mode-bar-end-btn')?.click();

    // Assert
    expect(leave).toHaveBeenCalledTimes(1);
  });
});
