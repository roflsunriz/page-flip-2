import { afterEach, describe, expect, it, mock } from 'bun:test';

import { ImagePage } from '../src/Page/ImagePage';
import { PageDensity, PageOrientation } from '../src/Page/Page';
import type { CanvasRender } from '../src/Render/CanvasRender';

describe('ImagePage', () => {
    const originalImage = globalThis.Image;

    afterEach(() => {
        globalThis.Image = originalImage;
        mock.restore();
    });

    it('attaches load handlers before assigning a cached image source', () => {
        class CachedImage {
            public static latest: CachedImage;
            public complete = true;
            public naturalWidth = 640;
            public onload: (() => void) | null = null;
            public onerror: (() => void) | null = null;
            public assignedWithLoadHandler = false;
            public removeAttribute = mock(() => undefined);

            constructor() {
                CachedImage.latest = this;
            }

            set src(_href: string) {
                this.assignedWithLoadHandler = this.onload !== null;
                this.onload?.();
            }
        }

        globalThis.Image = CachedImage as unknown as typeof Image;
        const drawImage = mock(() => undefined);
        const render = {
            getContext: () => ({ drawImage }),
            getRect: () => ({ left: 10, top: 20, width: 200, height: 200, pageWidth: 100 }),
        } as unknown as CanvasRender;
        const page = new ImagePage(render, '/cached-page.jpg', PageDensity.SOFT);
        const imageInstance = CachedImage.latest;

        page.load();
        page.simpleDraw(PageOrientation.RIGHT);

        expect(imageInstance.assignedWithLoadHandler).toBe(true);
        expect(drawImage).toHaveBeenCalledTimes(1);
        expect(drawImage).toHaveBeenCalledWith(imageInstance, 110, 20, 100, 200);

        page.destroy();

        expect(imageInstance.onload).toBeNull();
        expect(imageInstance.onerror).toBeNull();
        expect(imageInstance.removeAttribute).toHaveBeenCalledWith('src');
    });
});
