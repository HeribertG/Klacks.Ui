// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ScriptService } from './script.service';
import { ScriptExecutionContext } from './script-execution-context';

describe('Debug and Function Interaction', () => {
    let service: ScriptService;
    let debugOutput: string[] = [];

    beforeEach(() => {
        service = new ScriptService();
        debugOutput = [];
        
        // Mock the DebugPrint handler
        service.run = (source: string, optionExplicit = true, allowExternal = true) => {
            const script = service.compile(source, optionExplicit, allowExternal);
            const context = new ScriptExecutionContext(script);
            context.onDebugPrint = (msg: string) => debugOutput.push(msg);
            return context.execute();
        };
    });

    it('should handle Debug.Print inside a function', () => {
        const script = `
            Function TestFunc(val)
                DebugPrint "Inside Function: " & val
                TestFunc = val * 2
            End Function

            Dim res
            res = TestFunc(21)
            DebugPrint "Result: " & res
        `;

        const result = service.run(script, false, false);
        
        if (!result.success) {
            console.error('Test failed with error:', result.error);
        }
        expect(result.success).toBe(true);
        expect(debugOutput).toContain('Inside Function: 21');
        expect(debugOutput).toContain('Result: 42');
    });

    it('should handle Debug.Print with function call as argument', () => {
        const script = `
            Function GetVal()
                GetVal = 42
            End Function

            DebugPrint GetVal()
        `;

        const result = service.run(script, false, false);
        
        expect(result.success).toBe(true);
        expect(debugOutput).toContain('42');
    });

    it('should handle Debug.Print inside a Sub', () => {
        const script = `
            Sub TestSub()
                DebugPrint "Inside Sub"
            End Sub

            TestSub()
        `;

        const result = service.run(script, false, false);
        
        if (!result.success) {
            console.error('Test failed with error:', result.error);
        }
        expect(result.success).toBe(true);
        expect(debugOutput).toContain('Inside Sub');
    });
    
    it('should handle Debug.Print with a Sub call (which returns void) - EXPECTED TO FAIL?', () => {
         // This is a potential issue area. VBScript allows calling Subs but they don't return values.
         // If Debug.Print tries to pop a value from a Sub call, it might pop the wrong thing.
         // However, syntax analyzer should probably prevent Debug.Print SubCall() if SubCall doesn't evaluate.
         // But "Call SubName" is a statement. "SubName" might be interpreted as a function call that returns nothing?
         
         const script = `
            Sub MySub()
            End Sub
            
            ' In VBScript, you can't print a Sub call result directly if it doesn't return anything.
            ' But maybe the parser allows it and then runtime fails?
            DebugPrint MySub() 
         `;
         
         // If this compiles, it might crash runtime.
         const _result = service.run(script, false, false);
         
         // If it's disallowed, success should be false. If it runs and crashes/hangs/pops wrong value, that's the bug.
         // For now, let's see what happens.
    });
});
