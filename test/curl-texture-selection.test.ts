import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { DisplayMode, PageFlip, ReadingDirection } from '../src';
import { FlipDirection } from '../src/Flip/Flip';
import type { ReflectionCurlFold } from '../src/Flip/ReflectionCurl';
import type { Page } from '../src/Page/Page';
import type { CurlOverlay } from '../src/Render/CurlOverlay';

const fold: ReflectionCurlFold = {
    progress: 25,
    creaseMid: { x: 300, y: 300 },
    creaseDirection: { x: 0, y: 1 },
    dragDistance: 200,
};

const createBook = (readingDirection: ReadingDirection, displayMode: DisplayMode) => {
    const root = document.createElement('div');
    const elements = Array.from({ length: 4 }, (_, index) => {
        const page = document.createElement('div');
        page.dataset['pageIndex'] = String(index);
        return page;
    });
    root.append(...elements);
    document.body.append(root);

    const book = new PageFlip(root, {
        width: 400,
        height: 600,
        displayMode,
        readingDirection,
    });
    book.loadFromHTML(elements);
    return book;
};

const capturePreparedTextures = (
    book: PageFlip,
    direction: FlipDirection,
): readonly [Page, Page | null] => {
    const render = book.getRender();
    const pages = book.getPageCollection();
    const flippingPage = pages.getFlippingPage(direction);
    const bottomPage = pages.getBottomPage(direction);
    const prepare = mock((front: Page, back: Page | null, width: number, height: number) => ({
        back,
        front,
        height,
        width,
    }));
    const overlay = { prepare } as unknown as CurlOverlay;

    Reflect.set(render, 'curlOverlay', overlay);
    render.setDirection(direction);
    render.setBottomPage(bottomPage);
    render.setCurlData(fold);
    render.setFlippingPage(flippingPage);

    const call = prepare.mock.calls[0];
    Reflect.set(render, 'curlOverlay', null);
    if (call === undefined) throw new Error('Curl textures were not prepared');
    return [call[0], call[1]];
};

describe('page curl texture selection', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    beforeEach(() => {
        globalThis.requestAnimationFrame = mock(() => 1);
    });

    afterEach(() => {
        mock.restore();
        globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        document.body.replaceChildren();
    });

    it('uses the current right page and the turning page for an LTR landscape turn', () => {
        const book = createBook(ReadingDirection.LTR, DisplayMode.LANDSCAPE);
        const [front, back] = capturePreparedTextures(book, FlipDirection.FORWARD);

        expect(front).toBe(book.getPage(1));
        expect(back).toBe(book.getPage(2));

        book.destroy();
    });

    it('uses the current left page and the next right page for an RTL landscape turn', () => {
        const book = createBook(ReadingDirection.RTL, DisplayMode.LANDSCAPE);
        const [front, back] = capturePreparedTextures(book, FlipDirection.BACK);

        expect(front).toBe(book.getPage(1));
        expect(back).toBe(book.getPage(2));

        book.destroy();
    });

    it('uses the current right page and the previous left page for an RTL reverse turn', () => {
        const book = createBook(ReadingDirection.RTL, DisplayMode.LANDSCAPE);
        book.turnToNextPage();
        const [front, back] = capturePreparedTextures(book, FlipDirection.FORWARD);

        expect(front).toBe(book.getPage(2));
        expect(back).toBe(book.getPage(1));

        book.destroy();
    });

    it.each([ReadingDirection.LTR, ReadingDirection.RTL])(
        'uses the incoming page as the back texture in %s portrait mode',
        (readingDirection) => {
            const book = createBook(readingDirection, DisplayMode.PORTRAIT);
            const direction =
                readingDirection === ReadingDirection.RTL
                    ? FlipDirection.BACK
                    : FlipDirection.FORWARD;
            const [front, back] = capturePreparedTextures(book, direction);

            expect(front).toBe(book.getPage(0));
            expect(back).toBe(book.getPage(1));

            book.destroy();
        },
    );
});
