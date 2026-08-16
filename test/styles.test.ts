import { beforeEach, describe, expect, it } from 'bun:test';

import { PageFlip } from '../src';

const STYLE_SELECTOR = 'style[data-page-flip-2-styles]';

describe('style injection', () => {
    beforeEach(() => {
        document.head.querySelectorAll(STYLE_SELECTOR).forEach((style) => style.remove());
        document.body.replaceChildren();
    });

    it('injects styles once into the document root', () => {
        const firstRoot = document.createElement('div');
        const secondRoot = document.createElement('div');
        document.body.append(firstRoot, secondRoot);

        const firstBook = new PageFlip(firstRoot, { width: 400, height: 600 });
        const secondBook = new PageFlip(secondRoot, { width: 400, height: 600 });

        expect(document.head.querySelectorAll(STYLE_SELECTOR)).toHaveLength(1);

        firstBook.destroy();
        secondBook.destroy();
    });

    it('injects styles once into each shadow root', () => {
        const host = document.createElement('div');
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const firstRoot = document.createElement('div');
        const secondRoot = document.createElement('div');
        shadowRoot.append(firstRoot, secondRoot);
        document.body.append(host);

        const firstBook = new PageFlip(firstRoot, { width: 400, height: 600 });
        const secondBook = new PageFlip(secondRoot, { width: 400, height: 600 });

        expect(shadowRoot.querySelectorAll(STYLE_SELECTOR)).toHaveLength(1);
        expect(document.head.querySelector(STYLE_SELECTOR)).toBeNull();

        firstBook.destroy();
        secondBook.destroy();
    });
});
