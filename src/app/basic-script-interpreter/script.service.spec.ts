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
    { script: 'debugprint 10/9', result: '1.1111111111111112' },
    { script: 'message 1, 10/9', result: '1.1111111111111112' },
    { script: 'debugprint 10\\9', result: '1' },
    { script: 'message 1, 10\\9', result: '1' },
    { script: 'debugprint 10 mod 3', result: '1' },
    { script: 'message 1, 10 mod 3', result: '1' },
    { script: 'debugprint 10 ^ 3', result: '1000' },
    { script: 'message 1, 10 ^ 3', result: '1000' },
    { script: 'debugprint -1 * -1', result: '1' },
    { script: 'message 1, -1 * -1', result: '1' },
    { script: 'debugprint 1 * -1', result: '-1' },
    { script: 'message 1, 1 * -1', result: '-1' },
    { script: 'debugprint 0 * 1', result: '0' },
    { script: 'message 1, 0 * 1', result: '0' },
    { script: 'debugprint 0 / 1', result: '0' },
    { script: 'message 1, 0 / 1', result: '0' },
    { script: 'debugprint 1 / 0', result: 'Infinity' },
    { script: 'message 1, 1 / 0', result: 'Infinity' },
    { script: 'debugprint 2 + 3 * 4', result: '14' },
    { script: 'message 1, 2 + 3 * 4', result: '14' },
    { script: 'debugprint (2 + 3) * 4', result: '20' },
    { script: 'message 1, (2 + 3) * 4', result: '20' },
    {
      script:
        'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\ndebugprint x',
      result: '14 cm',
    },
    {
      script:
        'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\nmessage 1, x',
      result: '14 cm',
    },
    {
      script:
        'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\ndebugprint x',
      result: '14 cm',
    },
    {
      script:
        'dim x\n\nx = 10\nx += 5\nx *= 3\nx -=10\nx /= 2.5\n\nx &= " cm"\n\nmessage 1, x',
      result: '14 cm',
    },
  ];

  testCases.forEach((testCase) => {
    it(`should interpret correctly for script: ${testCase.script}`, () => {
      service.clearResult();
      service.clearDebugResult();
      const isCompiled = service.compile(testCase.script, false, false);
      expect(isCompiled).toBeTrue();
      const result = service.run();
      expect(result).toBeTrue();
      var message = service.result();
      if (message.length > 0) {
        expect(message[0].message.toString()).toBe(testCase.result.toString());
      }
      var debugMessage = service.debugResult();
      if (debugMessage.length > 0) {
        expect(debugMessage[0].message.toString()).toBe(
          testCase.result.toString()
        );
      }
    });
  });
});
