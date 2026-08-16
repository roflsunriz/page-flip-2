import { describe, expect, it } from 'bun:test';

import { CoverDensity, DisplayMode, ReadingDirection, Settings, SizeType } from '../src/Settings';

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

    it('does not leak options from one call into the next', () => {
        const settingsFactory = new Settings();

        const rtl = settingsFactory.getSettings({
            width: 400,
            height: 600,
            readingDirection: ReadingDirection.RTL,
            drawShadow: false,
        });
        const defaults = settingsFactory.getSettings({
            width: 400,
            height: 600,
        });

        expect(rtl.readingDirection).toBe(ReadingDirection.RTL);
        expect(rtl.drawShadow).toBe(false);
        expect(defaults.readingDirection).toBe(ReadingDirection.LTR);
        expect(defaults.drawShadow).toBe(true);
    });

    it('rejects unsupported reading directions', () => {
        expect(() =>
            new Settings().getSettings({
                width: 400,
                height: 600,
                readingDirection: 'vertical' as ReadingDirection,
            }),
        ).toThrow('Invalid reading direction');
    });

    it('validates standalone cover density', () => {
        const settings = new Settings();

        expect(
            settings.getSettings({ width: 400, height: 600, coverDensity: CoverDensity.SOFT })
                .coverDensity,
        ).toBe(CoverDensity.SOFT);
        expect(() =>
            settings.getSettings({
                width: 400,
                height: 600,
                coverDensity: 'cardboard' as CoverDensity,
            }),
        ).toThrow('Invalid cover density');
    });

    it('validates the Canvas background color', () => {
        const settings = new Settings();

        expect(
            settings.getSettings({ width: 400, height: 600, backgroundColor: '#123456' })
                .backgroundColor,
        ).toBe('#123456');
        expect(() =>
            settings.getSettings({ width: 400, height: 600, backgroundColor: '   ' }),
        ).toThrow('Invalid background color');
    });

    it('validates explicit display modes', () => {
        const settings = new Settings();

        expect(
            settings.getSettings({ width: 400, height: 600, displayMode: DisplayMode.PORTRAIT })
                .displayMode,
        ).toBe(DisplayMode.PORTRAIT);
        expect(() =>
            settings.getSettings({
                width: 400,
                height: 600,
                displayMode: 'square' as DisplayMode,
            }),
        ).toThrow('Invalid display mode');
    });
});
