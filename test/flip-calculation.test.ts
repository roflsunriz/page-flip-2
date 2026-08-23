import { describe, expect, it } from 'bun:test';
import { FlipCorner, FlipDirection } from '../src/Flip/Flip';
import { FlipCalculation } from '../src/Flip/FlipCalculation';

describe('manual flip corner calculation', () => {
    it('can switch from the press corner to the current pointer corner', () => {
        const width = 300;
        const height = 450;
        const calculation = new FlipCalculation(
            FlipDirection.FORWARD,
            FlipCorner.BOTTOM,
            width.toString(10),
            height.toString(10),
        );

        calculation.setCorner(FlipCorner.TOP);
        expect(calculation.getCorner()).toBe(FlipCorner.TOP);
        expect(calculation.calc({ x: width - 45, y: height * 0.05 })).toBe(true);

        calculation.setCorner(FlipCorner.BOTTOM);
        expect(calculation.getCorner()).toBe(FlipCorner.BOTTOM);
        expect(calculation.calc({ x: width - 45, y: height * 0.95 })).toBe(true);
    });
});
