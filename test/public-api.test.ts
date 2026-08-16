import { describe, expect, it } from 'bun:test';

import {
    CoverDensity,
    FlipCorner,
    FlipDirection,
    FlippingState,
    Orientation,
    PageDensity,
    PageFlip,
    PageOrientation,
    ReadingDirection,
    SizeType,
} from '../src';
import type { WidgetEvent } from '../src';

describe('public API', () => {
    it('exports the settings and state values used by consumers', () => {
        expect(String(ReadingDirection.RTL)).toBe('rtl');
        expect(String(CoverDensity.SOFT)).toBe('soft');
        expect(String(SizeType.STRETCH)).toBe('stretch');
        expect(String(FlipCorner.BOTTOM)).toBe('bottom');
        expect(Number(FlipDirection.FORWARD)).toBe(0);
        expect(String(FlippingState.READ)).toBe('read');
        expect(String(Orientation.LANDSCAPE)).toBe('landscape');
        expect(String(PageDensity.HARD)).toBe('hard');
        expect(Number(PageOrientation.RIGHT)).toBe(1);
    });

    it('supports typed event handlers and keeps them chainable', () => {
        const root = document.createElement('div');
        const pages = Array.from({ length: 4 }, () => document.createElement('div'));
        root.append(...pages);
        document.body.append(root);

        const emittedPages: number[] = [];
        const book = new PageFlip(root, {
            width: 400,
            height: 600,
            usePortrait: false,
        });
        const returnedBook = book.on<number>('flip', (event: WidgetEvent<number>) => {
            emittedPages.push(event.data);
        });

        book.loadFromHTML(pages);
        book.turnToNextPage();

        expect(returnedBook).toBe(book);
        expect(emittedPages).toEqual([0, 2]);

        book.destroy();
        root.remove();
    });
});
