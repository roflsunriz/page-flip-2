import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';

import { PageFlip, ReadingDirection } from '../src';
import type { HTMLPage } from '../src/Page/HTMLPage';
import { PageDensity } from '../src/Page/Page';
import { Orientation } from '../src/Render/Render';

type BookFixture = {
    book: PageFlip;
    pages: HTMLElement[];
    root: HTMLElement;
};

const createBook = (
    readingDirection: ReadingDirection,
    pageCount = 4,
    usePortrait = false,
): BookFixture => {
    const root = document.createElement('div');
    const pages = Array.from({ length: pageCount }, (_, index) => {
        const page = document.createElement('div');
        page.dataset['logicalPageIndex'] = String(index);
        return page;
    });

    root.append(...pages);
    document.body.append(root);

    const book = new PageFlip(root, {
        width: 400,
        height: 600,
        usePortrait,
        readingDirection,
    });
    book.loadFromHTML(pages);

    return { book, pages, root };
};

const getLogicalIndex = (page: HTMLPage): string | undefined =>
    page.getElement().dataset['logicalPageIndex'];

describe('reading direction', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    beforeEach(() => {
        jest.useFakeTimers();
        globalThis.requestAnimationFrame = mock(() => 1);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        mock.restore();
        globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        document.body.replaceChildren();
    });

    it('keeps logical pages in left-to-right physical order for LTR', () => {
        const { book, pages, root } = createBook(ReadingDirection.LTR);

        expect(root.getAttribute('data-page-flip-2-reading-direction')).toBe('ltr');
        expect(pages[0].classList).toContain('--left');
        expect(pages[1].classList).toContain('--right');
        expect(book.getCurrentPageIndex()).toBe(0);

        book.turnToNextPage();
        expect(book.getCurrentPageIndex()).toBe(2);

        book.turnToNextPage();
        expect(book.getCurrentPageIndex()).toBe(2);

        book.destroy();
    });

    it('mirrors physical page order while preserving logical indices for RTL', () => {
        const { book, pages, root } = createBook(ReadingDirection.RTL);
        const internalOrder = book
            .getPageCollection()
            .getPages()
            .map((page) => getLogicalIndex(page as HTMLPage));

        expect(root.getAttribute('data-page-flip-2-reading-direction')).toBe('rtl');
        expect(internalOrder).toEqual(['0', '1', '2', '3']);
        expect(pages[0].classList).toContain('--right');
        expect(pages[1].classList).toContain('--left');
        expect(getLogicalIndex(book.getPage(0) as HTMLPage)).toBe('0');
        expect(book.getCurrentPageIndex()).toBe(0);

        book.turnToNextPage();
        expect(book.getCurrentPageIndex()).toBe(2);

        book.turnToNextPage();
        expect(book.getCurrentPageIndex()).toBe(2);

        book.turnToPrevPage();
        expect(book.getCurrentPageIndex()).toBe(0);

        book.destroy();
    });

    it('keeps odd RTL books paired in logical spread order', () => {
        const { book, pages } = createBook(ReadingDirection.RTL, 3);

        expect(pages[0].classList).toContain('--right');
        expect(pages[1].classList).toContain('--left');

        book.turnToNextPage();

        expect(book.getCurrentPageIndex()).toBe(2);
        expect(pages[2].classList).toContain('--right');

        book.destroy();
    });

    it.each([ReadingDirection.LTR, ReadingDirection.RTL])(
        'keeps an unpaired final %s page soft unless explicitly configured as hard',
        (readingDirection) => {
            const automatic = createBook(readingDirection, 5);
            const automaticFinalPage = automatic.book.getPageCollection().getPage(4);

            expect(automaticFinalPage.getDensity()).toBe(PageDensity.SOFT);
            automatic.book.destroy();

            const explicit = createBook(readingDirection, 5);
            explicit.pages[4].dataset['density'] = PageDensity.HARD;
            explicit.book.updateFromHtml(explicit.pages);

            expect(explicit.book.getPageCollection().getPage(4).getDensity()).toBe(
                PageDensity.HARD,
            );
            explicit.book.destroy();
        },
    );

    it('places an RTL portrait page on the left half', () => {
        const { book, pages } = createBook(ReadingDirection.RTL, 3, true);

        expect(book.getOrientation()).toBe(Orientation.PORTRAIT);
        expect(pages[0].classList).toContain('--left');
        expect(book.getBoundsRect().left).toBe(-200);

        book.turnToNextPage();

        expect(book.getCurrentPageIndex()).toBe(1);
        expect(pages[1].classList).toContain('--left');

        book.destroy();
    });

    it('reports logical page indices from RTL flip events', () => {
        const root = document.createElement('div');
        const pages = Array.from({ length: 4 }, () => document.createElement('div'));
        root.append(...pages);
        document.body.append(root);

        const emittedPages: number[] = [];
        const book = new PageFlip(root, {
            width: 400,
            height: 600,
            usePortrait: false,
            readingDirection: ReadingDirection.RTL,
        });
        book.on('flip', ({ data }) => emittedPages.push(data as number));
        book.loadFromHTML(pages);
        book.turnToNextPage();

        expect(emittedPages).toEqual([0, 2]);

        book.destroy();
    });

    it('reports the displayed spread when startPage points inside or beyond it', () => {
        const root = document.createElement('div');
        const pages = Array.from({ length: 4 }, () => document.createElement('div'));
        root.append(...pages);
        document.body.append(root);

        const initializedPages: number[] = [];
        const book = new PageFlip(root, {
            width: 400,
            height: 600,
            usePortrait: false,
            readingDirection: ReadingDirection.RTL,
            startPage: 99,
        });
        book.on('init', ({ data }) => initializedPages.push((data as { page: number }).page));
        book.loadFromHTML(pages);
        jest.runOnlyPendingTimers();

        expect(book.getCurrentPageIndex()).toBe(2);
        expect(initializedPages).toEqual([2]);

        book.destroy();
    });

    it('maps logical animated turns to the correct physical edge', () => {
        const ltr = createBook(ReadingDirection.LTR).book;
        const ltrController = ltr.getFlipController();
        const ltrNext = spyOn(ltrController, 'flipNext').mockImplementation(() => undefined);
        const ltrPrevious = spyOn(ltrController, 'flipPrev').mockImplementation(() => undefined);

        ltr.flipNext();
        expect(ltrNext).toHaveBeenCalledTimes(1);
        expect(ltrPrevious).not.toHaveBeenCalled();

        ltr.flipPrev();
        expect(ltrPrevious).toHaveBeenCalledTimes(1);
        ltr.destroy();

        const rtl = createBook(ReadingDirection.RTL).book;
        const rtlController = rtl.getFlipController();
        const rtlPhysicalForward = spyOn(rtlController, 'flipNext').mockImplementation(
            () => undefined,
        );
        const rtlPhysicalBack = spyOn(rtlController, 'flipPrev').mockImplementation(
            () => undefined,
        );

        rtl.flipNext();
        expect(rtlPhysicalBack).toHaveBeenCalledTimes(1);
        expect(rtlPhysicalForward).not.toHaveBeenCalled();

        rtl.flipPrev();
        expect(rtlPhysicalForward).toHaveBeenCalledTimes(1);
        rtl.destroy();
    });
});
