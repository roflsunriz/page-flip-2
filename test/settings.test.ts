import { describe, expect, it } from 'vitest';

import { Settings, SizeType } from '../src/Settings';

describe('Settings', () => {
    it('derives fixed bounds from the requested page size', () => {
        const settings = new Settings().getSettings({
            width: 400,
            height: 600,
        });

        expect(settings.size).toBe(SizeType.FIXED);
        expect(settings.minWidth).toBe(400);
        expect(settings.maxWidth).toBe(400);
        expect(settings.minHeight).toBe(600);
        expect(settings.maxHeight).toBe(600);
    });

    it('rejects invalid dimensions and animation durations', () => {
        expect(() => new Settings().getSettings({ width: 0, height: 600 })).toThrow(
            'Invalid width or height',
        );
        expect(() =>
            new Settings().getSettings({
                width: 400,
                height: 600,
                flippingTime: 0,
            }),
        ).toThrow('Invalid flipping time');
    });

    it('fills safe minimum and maximum bounds for stretch mode', () => {
        const settings = new Settings().getSettings({
            size: SizeType.STRETCH,
            width: 400,
            height: 600,
        });

        expect(settings.minWidth).toBe(100);
        expect(settings.maxWidth).toBe(2000);
        expect(settings.minHeight).toBe(100);
        expect(settings.maxHeight).toBe(2000);
    });
});
