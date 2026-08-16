import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';

import { PageFlip } from '../src';

describe('lifecycle', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    beforeEach(() => {
        jest.useFakeTimers();
        globalThis.requestAnimationFrame = mock(() => 41);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        mock.restore();
        globalThis.requestAnimationFrame = originalRequestAnimationFrame;
        document.body.replaceChildren();
    });

    it('restores the caller-owned root and pages when destroyed', () => {
        const root = document.createElement('div');
        root.className = 'reader-host';
        root.style.minWidth = '123px';
        root.style.color = 'navy';
        root.setAttribute('data-page-flip-2-reading-direction', 'host-value');

        const firstPage = document.createElement('article');
        firstPage.className = 'original-page';
        firstPage.style.color = 'red';
        const secondPage = document.createElement('article');
        secondPage.className = 'original-page second-page';
        root.append(firstPage, secondPage);
        document.body.append(root);

        const cancelFrame = spyOn(globalThis, 'cancelAnimationFrame');
        const initListener = mock(() => undefined);
        const book = new PageFlip(root, {
            width: 400,
            height: 600,
            useMouseEvents: false,
        });
        book.on('init', initListener);
        book.loadFromHTML([firstPage, secondPage]);

        expect(root.querySelector('.page-flip-2__wrapper')).not.toBeNull();
        expect(firstPage.classList).toContain('page-flip-2__item');

        book.destroy();
        book.destroy();
        jest.runOnlyPendingTimers();

        expect(root.isConnected).toBe(true);
        expect([...root.children]).toEqual([firstPage, secondPage]);
        expect(root.className).toBe('reader-host');
        expect(root.style.minWidth).toBe('123px');
        expect(root.style.color).toBe('navy');
        expect(root.getAttribute('data-page-flip-2-reading-direction')).toBe('host-value');
        expect(firstPage.className).toBe('original-page');
        expect(firstPage.style.color).toBe('red');
        expect(secondPage.className).toBe('original-page second-page');
        expect(cancelFrame).toHaveBeenCalledTimes(1);
        expect(cancelFrame).toHaveBeenCalledWith(41);
        expect(initListener).not.toHaveBeenCalled();
    });

    it('does not keep scheduling frames while an initialized book is idle', () => {
        const queuedFrames: FrameRequestCallback[] = [];
        globalThis.requestAnimationFrame = mock((callback: FrameRequestCallback) => {
            queuedFrames.push(callback);
            return queuedFrames.length;
        });

        const root = document.createElement('div');
        const pages = [document.createElement('div'), document.createElement('div')];
        root.append(...pages);
        document.body.append(root);

        const book = new PageFlip(root, { width: 400, height: 600 });
        book.loadFromHTML(pages);

        expect(queuedFrames).toHaveLength(1);
        queuedFrames.shift()?.(performance.now());
        expect(queuedFrames).toHaveLength(0);

        book.update();
        expect(queuedFrames).toHaveLength(1);

        book.destroy();
    });

    it('sizes an auto-sized wrapper with aspect-ratio instead of vertical padding', () => {
        const root = document.createElement('div');
        const pages = [document.createElement('div'), document.createElement('div')];
        root.append(...pages);
        document.body.append(root);

        const book = new PageFlip(root, {
            width: 700,
            height: 1000,
            displayMode: 'landscape',
            autoSize: true,
        });
        book.loadFromHTML(pages);

        const wrapper = root.querySelector<HTMLElement>('.page-flip-2__wrapper');
        expect(wrapper?.style.aspectRatio).toBe('1400 / 1000');
        expect(wrapper?.style.paddingBottom).toBe('');

        book.destroy();
    });

    it('cleans replaced pages and clamps the current spread after an update', () => {
        const root = document.createElement('div');
        const originalPages = Array.from({ length: 4 }, (_, index) => {
            const page = document.createElement('article');
            page.className = `original-${index}`;
            return page;
        });
        root.append(...originalPages);
        document.body.append(root);

        const book = new PageFlip(root, {
            width: 400,
            height: 600,
            usePortrait: false,
        });
        book.loadFromHTML(originalPages);
        book.turnToNextPage();
        expect(book.getCurrentPageIndex()).toBe(2);

        const replacementPages = Array.from({ length: 2 }, (_, index) => {
            const page = document.createElement('section');
            page.className = `replacement-${index}`;
            page.style.color = 'green';
            return page;
        });
        const updatePages: number[] = [];
        book.on('update', ({ data }) => updatePages.push((data as { page: number }).page));

        book.updateFromHtml(replacementPages);

        expect(book.getCurrentPageIndex()).toBe(0);
        expect(updatePages).toEqual([0]);
        for (const [index, page] of originalPages.entries()) {
            expect(page.parentElement).toBeNull();
            expect(page.className).toBe(`original-${index}`);
            expect(page.getAttribute('style')).toBeNull();
        }

        book.destroy();

        expect([...root.children]).toEqual(replacementPages);
        for (const [index, page] of replacementPages.entries()) {
            expect(page.className).toBe(`replacement-${index}`);
            expect(page.style.color).toBe('green');
        }
    });

    it('forwards nested link and button interactions without starting a page turn', () => {
        const root = document.createElement('div');
        const firstPage = document.createElement('div');
        const link = document.createElement('a');
        const linkLabel = document.createElement('span');
        const button = document.createElement('button');
        const buttonLabel = document.createElement('span');
        link.append(linkLabel);
        button.append(buttonLabel);
        firstPage.append(link, button);
        const secondPage = document.createElement('div');
        root.append(firstPage, secondPage);
        document.body.append(root);

        const book = new PageFlip(root, { width: 400, height: 600 });
        const startUserTouch = spyOn(book, 'startUserTouch');
        book.loadFromHTML([firstPage, secondPage]);

        linkLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        buttonLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(startUserTouch).not.toHaveBeenCalled();

        firstPage.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(startUserTouch).toHaveBeenCalledTimes(1);

        book.destroy();
    });
});
