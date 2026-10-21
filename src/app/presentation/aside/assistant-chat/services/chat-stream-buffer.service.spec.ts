// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ChatStreamBufferService } from './chat-stream-buffer.service';
import { ChatTranscriptService } from './chat-transcript.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';

describe('ChatStreamBufferService', () => {
    const MESSAGE_ID = 'msg-1';
    let service: ChatStreamBufferService;
    let orchestrator: any;
    let navigation: any;
    let transcript: any;
    let stopped: boolean;

    function lastContent(): string {
        const calls = orchestrator.updateMessage.mock.calls;
        return calls[calls.length - 1][1].content;
    }

    beforeEach(() => {
        stopped = false;
        orchestrator = { updateMessage: vi.fn(), onStreamContent: vi.fn() };
        navigation = { queueExplainScroll: vi.fn() };
        transcript = { requestScrollToBottom: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                ChatStreamBufferService,
                { provide: ConversationOrchestratorService, useValue: orchestrator },
                { provide: KlacksyNavigationService, useValue: navigation },
                { provide: ChatTranscriptService, useValue: transcript },
            ],
        });
        service = TestBed.inject(ChatStreamBufferService);
        service.begin(() => stopped);
    });

    it('renders all appended chunks at once on drain and marks the message as streaming', () => {
        // Act
        service.append(MESSAGE_ID, 'Hallo ');
        service.append(MESSAGE_ID, 'Welt');
        service.drain(MESSAGE_ID);

        // Assert
        expect(orchestrator.updateMessage).toHaveBeenCalledTimes(1);
        expect(orchestrator.updateMessage.mock.calls[0][1]).toMatchObject({ content: 'Hallo Welt', isStreaming: true });
        expect(transcript.requestScrollToBottom).toHaveBeenCalled();
    });

    it('feeds only the new clean text to the sentence-wise speech', () => {
        // Act
        service.append(MESSAGE_ID, 'Erster Satz. ');
        service.drain(MESSAGE_ID);
        service.append(MESSAGE_ID, 'Zweiter Satz.');
        service.drain(MESSAGE_ID);

        // Assert
        expect(orchestrator.onStreamContent.mock.calls.map((call: string[]) => call[0])).toEqual([
            'Erster Satz.',
            'Zweiter Satz.',
        ]);
        expect(lastContent()).toBe('Erster Satz. Zweiter Satz.');
    });

    it('does not speak text of a stopped turn but still renders it', () => {
        // Arrange
        stopped = true;

        // Act
        service.append(MESSAGE_ID, 'Halbfertig.');
        service.drain(MESSAGE_ID);

        // Assert
        expect(lastContent()).toBe('Halbfertig.');
        expect(orchestrator.onStreamContent).not.toHaveBeenCalled();
    });

    it('queues each completed scroll marker once and strips it from the content', () => {
        // Act
        service.append(MESSAGE_ID, 'A [SCROLL:sec-1] B [SCR');
        service.drain(MESSAGE_ID);
        service.append(MESSAGE_ID, 'OLL:sec-2] C');
        service.drain(MESSAGE_ID);

        // Assert
        expect(navigation.queueExplainScroll.mock.calls.map((call: string[]) => call[0])).toEqual(['sec-1', 'sec-2']);
        expect(lastContent()).not.toContain('[SCROLL');
    });

    it('starts a new turn with empty buffers', () => {
        // Arrange
        service.append(MESSAGE_ID, 'alt');
        service.drain(MESSAGE_ID);
        orchestrator.updateMessage.mockClear();

        // Act
        service.begin(() => false);
        service.append(MESSAGE_ID, 'neu');
        service.drain(MESSAGE_ID);

        // Assert
        expect(lastContent()).toBe('neu');
    });
});
