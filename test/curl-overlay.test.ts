import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';

import type { Page } from '../src/Page/Page';
import { CurlOverlay, CurlOverlayState } from '../src/Render/CurlOverlay';

afterEach(() => mock.restore());

describe('rounded curl fallback', () => {
    it('stays unavailable without WebGL2 so the legacy renderer can remain visible', () => {
        spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
            (() => null) as typeof HTMLCanvasElement.prototype.getContext,
        );
        const wrapper = document.createElement('div');
        const overlay = new CurlOverlay(wrapper, 0, () => undefined);

        overlay.prepare({} as Page, null, 400, 600);

        expect(overlay.isReady()).toBe(false);
        expect(overlay.getState()).toBe(CurlOverlayState.FALLBACK);
        expect(
            wrapper.querySelector<HTMLCanvasElement>('.page-flip-2__curl-canvas')?.style.display,
        ).toBe('none');

        overlay.destroy();
        expect(wrapper.querySelector('.page-flip-2__curl-canvas')).toBeNull();
    });
});
