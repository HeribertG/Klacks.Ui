// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { ChatOnboardingCardComponent } from './chat-onboarding-card.component';
import { ChatOnboardingTourService } from '../services/chat-onboarding-tour.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { SETUP_CARD_KEYS } from '../services/chat-onboarding-tour.constants';

describe('ChatOnboardingCardComponent', () => {
    let fixture: ComponentFixture<ChatOnboardingCardComponent>;
    let mockTour: any;

    function button(selector: string): HTMLButtonElement | null {
        return fixture.nativeElement.querySelector(selector);
    }

    beforeEach(async () => {
        mockTour = {
            onboardingCardKeys: signal(SETUP_CARD_KEYS),
            displayedTourProgress: signal(0),
            startOnboardingTour: vi.fn(),
            resumeTourOneStepBack: vi.fn(),
            dismissOnboarding: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [ChatOnboardingCardComponent, TranslateModule.forRoot()],
            providers: [
                { provide: ChatOnboardingTourService, useValue: mockTour },
                { provide: OnboardingService, useValue: { total: signal(4) } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatOnboardingCardComponent);
        fixture.detectChanges();
    });

    it('offers start without a back step before the first station', () => {
        // Assert
        expect(button('.onboarding-card-back')).toBeNull();
        expect(button('.onboarding-card-start')?.textContent?.trim()).toBe(SETUP_CARD_KEYS.start);
    });

    it('offers resume and one step back once the tour made progress', () => {
        // Arrange
        mockTour.displayedTourProgress.set(2);
        fixture.detectChanges();

        // Act
        button('.onboarding-card-back')!.click();
        button('.onboarding-card-start')!.click();

        // Assert
        expect(button('.onboarding-card-start')?.textContent?.trim()).toBe(SETUP_CARD_KEYS.resume);
        expect(mockTour.resumeTourOneStepBack).toHaveBeenCalledTimes(1);
        expect(mockTour.startOnboardingTour).toHaveBeenCalledTimes(1);
    });

    it('fills the progress bar by done / total', () => {
        // Arrange
        mockTour.displayedTourProgress.set(1);
        fixture.detectChanges();

        // Assert
        const fill: HTMLElement = fixture.nativeElement.querySelector('.onboarding-card-fill');
        expect(fill.style.width).toBe('25%');
    });

    it('dismisses the onboarding from the close button', () => {
        // Act
        button('.onboarding-card-dismiss')!.click();

        // Assert
        expect(mockTour.dismissOnboarding).toHaveBeenCalledTimes(1);
    });
});
