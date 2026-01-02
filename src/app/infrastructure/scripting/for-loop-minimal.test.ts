import { ScriptService } from './script.service';

describe('FOR Loop Minimal Test', () => {
    let service: ScriptService;

    beforeEach(() => {
        service = new ScriptService();
    });

    it('should execute FOR loop 1 to 5', () => {
        // Arrange
        const script = `
            dim i, sum
            sum = 0
            for i = 1 to 5
                sum = sum + i
            next
            output 1, sum
        `;

        // Act
        const result = service.run(script, false, false);

        // Assert
        expect(result.success).toBe(true);
        expect(result.messages[0].message).toBe('15');
    });
});
