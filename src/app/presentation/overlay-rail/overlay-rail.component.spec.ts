// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayRailComponent } from './overlay-rail.component';
import { AsideService } from '../aside/aside.service';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';

// The real children (ToastsContainerComponent, AudioModePanelsComponent, VoiceShellComponent,
// VoiceShellInputComponent) each pull in their own dependency graph - toast service, goal-candidate
// /plan data services, translation, FontAwesome icons, speech recognition/synthesis wiring. None of
// that is relevant to what this spec verifies (the rail's own ownership of zone visibility, docking
// and stacking), so all four are replaced with selector-matching stand-ins.
@Component({ selector: 'app-toasts', standalone: true, template: '' })
class StubToastsComponent {}

@Component({ selector: 'app-audio-mode-panels', standalone: true, template: '' })
class StubAudioModePanelsComponent {}

@Component({ selector: 'app-voice-shell', standalone: true, template: '' })
class StubVoiceShellComponent {}

@Component({ selector: 'app-voice-shell-input', standalone: true, template: '' })
class StubVoiceShellInputComponent {}

describe('OverlayRailComponent', () => {
  let fixture: ComponentFixture<OverlayRailComponent>;
  let isVisible: WritableSignal<boolean>;
  let isFloatingMode: WritableSignal<boolean>;
  let isAudioOnlyMode: WritableSignal<boolean>;
  let isAutoSpeakMode: WritableSignal<boolean>;

  // Mirrors SpeechOutputModeService's own predicate (Audio and BothAuto are the two floating modes;
  // Audio alone is audio-only; BothAuto alone is auto-speak) so every test drives the three mocked
  // booleans into a combination the real service could actually produce. The predicate itself is
  // covered by speech-output-mode.service.spec.ts; duplicating it here only pins the mocked state to
  // a real mode instead of letting the three signals drift into an impossible combination.
  function applyOutputMode(mode: string): void {
    isFloatingMode.set(mode === OutputMode.Audio || mode === OutputMode.BothAuto);
    isAudioOnlyMode.set(mode === OutputMode.Audio);
    isAutoSpeakMode.set(mode === OutputMode.BothAuto);
  }

  // SpeechOutputModeService.mode() is itself derived from AppSettingsManagementService and
  // OnboardingService, both of which would need their own providers to build here. The rail only
  // ever reads the three boolean computeds below (see overlay-rail.component.ts), so mocking them
  // directly with signals is a faithful, simpler test of the rail's own logic without pulling in the
  // service's internal wiring - which has its own spec already.
  beforeEach(async () => {
    isVisible = signal(false);
    isFloatingMode = signal(false);
    isAudioOnlyMode = signal(false);
    isAutoSpeakMode = signal(false);

    await TestBed.configureTestingModule({
      imports: [OverlayRailComponent],
      providers: [
        { provide: AsideService, useValue: { isVisible } },
        { provide: SpeechOutputModeService, useValue: { isFloatingMode, isAudioOnlyMode, isAutoSpeakMode } },
      ],
    })
      .overrideComponent(OverlayRailComponent, {
        set: {
          imports: [
            StubToastsComponent,
            StubAudioModePanelsComponent,
            StubVoiceShellComponent,
            StubVoiceShellInputComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OverlayRailComponent);
  });

  it('always renders the messages lane, even with nothing in it', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lane-messages')).not.toBeNull();
  });

  describe('persistent lane visibility', () => {
    it('appears whenever the aside is open', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.lane-persistent')).not.toBeNull();
    });

    it('stays hidden while the aside is closed', () => {
      isVisible.set(false);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.lane-persistent')).toBeNull();
    });

    // The assistant's ambient surfaces are their own lane in every output mode, not a section of
    // the conversation, so text mode gets them too. They follow the assistant being open.
    it('appears in text mode as well, since the lane belongs to the assistant, not to a mode', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Text);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.lane-persistent')).not.toBeNull();
    });

    // Regression: the lane is gated on showPersistentZone() (the aside being open), never on
    // whether app-audio-mode-panels itself has anything to show. The stub renders no content at all
    // (template: ''), so if the lane still appears here, that proves the mode/aside condition alone
    // owns visibility - a test that only worked while candidates/a plan happened to exist would not
    // have caught a regression where the lane started depending on content again.
    it('appears from the mode alone, even though the stubbed panels render no content', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      const persistentLane = fixture.nativeElement.querySelector('.lane-persistent') as HTMLElement;
      expect(persistentLane).not.toBeNull();

      const panels = persistentLane.querySelector('app-audio-mode-panels') as HTMLElement;
      expect(panels).not.toBeNull();
      expect(panels.textContent?.trim()).toBe('');
    });
  });

  describe('asideDocked', () => {
    it('is true when the aside is visible and the mode is not floating (text or both)', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Both);
      fixture.detectChanges();

      expect(fixture.componentInstance.asideDocked()).toBe(true);
      expect(fixture.nativeElement.classList.contains('aside-docked')).toBe(true);
    });

    // In a floating mode (audio, both-auto) the aside only mounts a zero-sized bootstrap host, so
    // the rail must keep the edge for itself instead of stepping inside a panel that isn't really
    // occupying it.
    it('is false in a floating mode, even while the aside is visible', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.BothAuto);
      fixture.detectChanges();

      expect(fixture.componentInstance.asideDocked()).toBe(false);
      expect(fixture.nativeElement.classList.contains('aside-docked')).toBe(false);
    });

    it('is false when the aside is closed', () => {
      isVisible.set(false);
      applyOutputMode(OutputMode.Text);
      fixture.detectChanges();

      expect(fixture.componentInstance.asideDocked()).toBe(false);
      expect(fixture.nativeElement.classList.contains('aside-docked')).toBe(false);
    });
  });

  describe('voice shell bubble', () => {
    it('appears when the aside is visible and the mode is floating', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-voice-shell')).not.toBeNull();
    });

    it('does not appear in text mode', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Text);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-voice-shell')).toBeNull();
    });

    it('does not appear while the aside is closed', () => {
      isVisible.set(false);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-voice-shell')).toBeNull();
    });
  });

  describe('voice shell floating input', () => {
    it('appears in both-auto mode', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.BothAuto);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-voice-shell-input')).not.toBeNull();
    });

    // Audio is floating too, but it drives voice output only - the typed input bar belongs to
    // both-auto, where a typed message can still interrupt speech.
    it('does not appear in audio-only mode', () => {
      isVisible.set(true);
      applyOutputMode(OutputMode.Audio);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-voice-shell-input')).toBeNull();
    });
  });

  // Regression: content type owns which lane an overlay lives in - the bubble/input belong in
  // lane-voice, toasts in lane-messages, cards in lane-persistent - never arrival order. Being
  // merely present in the DOM proves nothing about that; this asserts each overlay sits inside its
  // own lane and nowhere else, plus that the bubble precedes its input bar within that lane.
  it('keeps each overlay inside its own lane', () => {
    isVisible.set(true);
    applyOutputMode(OutputMode.BothAuto);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const voiceLane = host.querySelector('.lane-voice') as Element;
    const messagesLane = host.querySelector('.lane-messages') as Element;
    const voiceShell = host.querySelector('app-voice-shell') as Element;
    const voiceInput = host.querySelector('app-voice-shell-input') as Element;
    const toasts = host.querySelector('app-toasts') as Element;

    expect(voiceLane).not.toBeNull();
    expect(messagesLane).not.toBeNull();

    expect(voiceLane.contains(voiceShell)).toBe(true);
    expect(voiceLane.contains(voiceInput)).toBe(true);
    expect(messagesLane.contains(toasts)).toBe(true);
    expect(voiceLane.contains(toasts)).toBe(false);
    expect(messagesLane.contains(voiceShell)).toBe(false);

    const voiceLaneChildren = Array.from(voiceLane.children);
    expect(voiceLaneChildren.indexOf(voiceShell)).toBeGreaterThanOrEqual(0);
    expect(voiceLaneChildren.indexOf(voiceInput)).toBeGreaterThanOrEqual(0);
    expect(voiceLaneChildren.indexOf(voiceShell)).toBeLessThan(voiceLaneChildren.indexOf(voiceInput));
  });

  // Regression: in the single-column fallback (narrow screens, or a docked aside which forces
  // column layout even on wide screens) the `order` values are the ONLY thing that puts the bubble
  // above the messages, which sit above the cards - the DOM order is deliberately the opposite
  // (messages, persistent, voice) so the row layout can put the bubble at the outer edge and mirror
  // under RTL without a second rule. A test that trusted DOM order here would be asserting the exact
  // opposite of what the single-column layout actually renders.
  it('orders the lanes for the single-column fallback via CSS order, not DOM order', () => {
    // Audio, not both-auto: this is the mode that renders the bubble without the input bar
    // that renders the voice lane's bubble and the persistent lane at the same time, alongside the
    // always-present messages lane - all three must exist to compare their order values.
    isVisible.set(true);
    applyOutputMode(OutputMode.Audio);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const voiceLane = host.querySelector('.lane-voice') as HTMLElement;
    const messagesLane = host.querySelector('.lane-messages') as HTMLElement;
    const persistentLane = host.querySelector('.lane-persistent') as HTMLElement;

    // jsdom does resolve `order` to a computed value here (verified '1'/'2'/'3', not '') - the same
    // mechanism audio-mode-panels.component.spec.ts already relies on for flex-direction/pointer-
    // events, so no class-based fallback is needed for this environment.
    const voiceOrder = Number(getComputedStyle(voiceLane).order);
    const messagesOrder = Number(getComputedStyle(messagesLane).order);
    const persistentOrder = Number(getComputedStyle(persistentLane).order);

    expect(voiceOrder).toBeLessThan(messagesOrder);
    expect(messagesOrder).toBeLessThan(persistentOrder);

    // `order` only has any effect while the container is a column flex - without this, the order
    // values alone would still read '1'/'2'/'3' even if someone dropped `display: flex` from
    // `.overlay-rail` or switched its default direction to `row`, and the single-column fallback the
    // comment above describes would be gone while this test kept passing.
    const rail = host.querySelector('.overlay-rail') as HTMLElement;
    expect(getComputedStyle(rail).flexDirection).toBe('column');
  });

  // Regression: the rail spans a tall strip down the inline edge and must never shield the page
  // behind it. The `pointer-events: auto` opt-in for actual clickable content (ngb-toast, the
  // audio-mode cards, the bubble/input themselves) lives one level deeper, inside the stubbed-out
  // children, so it renders nothing here and cannot be asserted by this spec - only the single
  // `.overlay-rail` container, which is the actual click-through surface now that :host is
  // display: contents, is in scope.
  it('keeps the rail container click-through', () => {
    isVisible.set(true);
    applyOutputMode(OutputMode.Audio);
    fixture.detectChanges();

    const rail = fixture.nativeElement.querySelector('.overlay-rail') as HTMLElement;

    expect(getComputedStyle(rail).pointerEvents).toBe('none');
  });
});
