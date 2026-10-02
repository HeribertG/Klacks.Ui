// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ScenarioBannerComponent } from './scenario-banner.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioActionsService } from '../services/scenario-actions.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';

describe('ScenarioBannerComponent', () => {
  const scenario = { id: 'scenario-1', token: 'token-1', name: 'Oktober Variante B' } as IAnalyseScenario;

  let activeScenario: WritableSignal<IAnalyseScenario | null>;
  let canDecide: WritableSignal<boolean>;
  let actions: {
    canDecide: WritableSignal<boolean>;
    confirmAccept: ReturnType<typeof vi.fn>;
    confirmReject: ReturnType<typeof vi.fn>;
    exit: ReturnType<typeof vi.fn>;
  };

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(ScenarioBannerComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const button = (host: HTMLElement, id: string): HTMLButtonElement | null =>
    host.querySelector<HTMLButtonElement>(`#${id}`);

  beforeEach(() => {
    activeScenario = signal<IAnalyseScenario | null>(scenario);
    canDecide = signal(true);
    actions = { canDecide, confirmAccept: vi.fn(), confirmReject: vi.fn(), exit: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ScenarioBannerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AnalyseScenarioService, useValue: { activeScenario } },
        { provide: ScenarioActionsService, useValue: actions },
      ],
    });
  });

  it('names the active scenario and states that the original plan stays unchanged', () => {
    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#scenario-banner')).not.toBeNull();
    expect(host.querySelector('#scenario-banner-name')?.textContent).toContain('Oktober Variante B');
    expect(host.textContent).toContain('scenario.banner.hint');
  });

  it('renders nothing while no scenario is active', () => {
    // Arrange
    activeScenario.set(null);

    // Act
    const host = render();

    // Assert
    expect(host.querySelector('#scenario-banner')).toBeNull();
  });

  it('delegates accept, reject and back-to-original to the shared scenario actions', () => {
    // Arrange
    const host = render();

    // Act
    button(host, 'scenario-banner-accept-btn')!.click();
    button(host, 'scenario-banner-reject-btn')!.click();
    button(host, 'scenario-banner-exit-btn')!.click();

    // Assert
    expect(actions.confirmAccept).toHaveBeenCalledTimes(1);
    expect(actions.confirmReject).toHaveBeenCalledTimes(1);
    expect(actions.exit).toHaveBeenCalledTimes(1);
  });

  it('offers reject as an icon-only button with an accessible name and tooltip from the translation key', () => {
    // Act
    const host = render();
    const rejectButton = button(host, 'scenario-banner-reject-btn')!;

    // Assert
    expect(rejectButton.querySelector('app-icon-trash-red')).not.toBeNull();
    expect(rejectButton.textContent?.trim()).toBe('');
    expect(rejectButton.getAttribute('aria-label')).toBe('scenario.reject');
    expect(rejectButton.getAttribute('title')).toBe('scenario.reject');
  });

  it('hides accept and reject from a user who may not decide, but keeps back-to-original', () => {
    // Arrange
    canDecide.set(false);

    // Act
    const host = render();

    // Assert
    expect(button(host, 'scenario-banner-accept-btn')).toBeNull();
    expect(button(host, 'scenario-banner-reject-btn')).toBeNull();
    expect(button(host, 'scenario-banner-exit-btn')).not.toBeNull();
  });
});
