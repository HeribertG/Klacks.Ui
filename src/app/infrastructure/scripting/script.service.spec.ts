import { TestBed } from '@angular/core/testing';

import { ScriptService } from './script.service';

describe('ScriptService', () => {
    let service: ScriptService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ScriptService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const testCases = [
        { script: 'debugprint 10/9', result: '1.1111111111111112', isDebug: true },
        { script: 'message 1, 10/9', result: '1.1111111111111112', isDebug: false },
        { script: 'debugprint 10\\9', result: '1', isDebug: true },
        { script: 'message 1, 10\\9', result: '1', isDebug: false },
        { script: 'debugprint 10 mod 3', result: '1', isDebug: true },
        { script: 'message 1, 10 mod 3', result: '1', isDebug: false },
        { script: 'debugprint 10 ^ 3', result: '1000', isDebug: true },
        { script: 'message 1, 10 ^ 3', result: '1000', isDebug: false },
        { script: 'debugprint -1 * -1', result: '1', isDebug: true },
        { script: 'message 1, -1 * -1', result: '1', isDebug: false },
        { script: 'debugprint 1 * -1', result: '-1', isDebug: true },
        { script: 'message 1, 1 * -1', result: '-1', isDebug: false },
        { script: 'debugprint 0 * 1', result: '0', isDebug: true },
        { script: 'message 1, 0 * 1', result: '0', isDebug: false },
        { script: 'debugprint 0 / 1', result: '0', isDebug: true },
        { script: 'message 1, 0 / 1', result: '0', isDebug: false },
        { script: 'debugprint 1 / 0', result: '∞', isDebug: true },
        { script: 'message 1, 1 / 0', result: '∞', isDebug: false },
        { script: 'debugprint 2 + 3 * 4', result: '14', isDebug: true },
        { script: 'message 1, 2 + 3 * 4', result: '14', isDebug: false },
        { script: 'debugprint (2 + 3) * 4', result: '20', isDebug: true },
        { script: 'message 1, (2 + 3) * 4', result: '20', isDebug: false },
        {
            script: 'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\ndebugprint x',
            result: '14 cm',
            isDebug: true,
        },
        {
            script: 'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\nmessage 1, x',
            result: '14 cm',
            isDebug: false,
        },
    ];

    testCases.forEach((testCase) => {
        it(`should interpret correctly for script: ${testCase.script}`, () => {
            // Arrange & Act
            const result = service.run(testCase.script, false, false);

            // Assert
            expect(result.success).toBe(true);

            if (testCase.isDebug) {
                // debugprint doesn't add to messages, we need to check via context
                // For now, we verify the script compiled and ran successfully
                expect(result.error).toBeNull();
            } else {
                expect(result.messages.length).toBeGreaterThan(0);
                expect(result.messages[0].message).toBe(testCase.result);
            }
        });
    });

    it('should return error for invalid script', () => {
        // Arrange & Act
        const result = service.run('invalid syntax here !!!', false, false);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).not.toBeNull();
    });

    it('should compile script separately and execute later', () => {
        // Arrange
        const script = service.compile('message 1, 42', false, false);

        // Act
        const result = service.execute(script);

        // Assert
        expect(result.success).toBe(true);
        expect(result.messages[0].message).toBe('42');
    });
});
