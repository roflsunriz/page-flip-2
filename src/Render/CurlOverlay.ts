import { PageRect } from '../BasicTypes';
import { FlipDirection } from '../Flip/Flip';
import { ReflectionCurlFold } from '../Flip/ReflectionCurl';
import { Page } from '../Page/Page';
import { CURL_VERTICAL_PADDING_RATIO, WebGLCurlRenderer } from './WebGLCurlRenderer';

type TextureKey = {
    back: Page | null;
    front: Page;
    height: number;
    width: number;
};

const sameKey = (left: TextureKey | null, right: TextureKey): boolean =>
    left !== null &&
    left.front === right.front &&
    left.back === right.back &&
    left.width === right.width &&
    left.height === right.height;

export const CurlOverlayState = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    READY: 'ready',
    FALLBACK: 'fallback',
} as const;

export type CurlOverlayState = (typeof CurlOverlayState)[keyof typeof CurlOverlayState];

/** Owns the single shared WebGL canvas used while a soft page is curling. */
export class CurlOverlay {
    private readonly canvas: HTMLCanvasElement;
    private renderer: WebGLCurlRenderer = null;
    private textureKey: TextureKey = null;
    private generation = 0;
    private state: CurlOverlayState = CurlOverlayState.IDLE;
    private permanentlyUnavailable = false;

    constructor(
        parent: HTMLElement,
        startZIndex: number,
        private readonly onStateChange: () => void,
    ) {
        this.canvas = parent.ownerDocument.createElement('canvas');
        this.canvas.className = 'page-flip-2__curl-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.canvas.style.display = 'none';
        this.canvas.style.zIndex = (startZIndex + 20).toString(10);
        this.canvas.addEventListener('webglcontextlost', this.onContextLost);
        parent.appendChild(this.canvas);
    }

    private onContextLost = (event: Event): void => {
        event.preventDefault();
        this.permanentlyUnavailable = true;
        this.hide();
        this.setState(CurlOverlayState.FALLBACK);
    };

    private setState(state: CurlOverlayState): void {
        if (this.state === state) return;

        this.state = state;
        this.onStateChange();
    }

    private ensureRenderer(): boolean {
        if (this.renderer !== null) return true;
        if (this.permanentlyUnavailable) return false;

        try {
            this.renderer = new WebGLCurlRenderer(this.canvas);
            return true;
        } catch {
            this.permanentlyUnavailable = true;
            return false;
        }
    }

    public prepare(front: Page, back: Page | null, width: number, height: number): void {
        if (this.permanentlyUnavailable || !this.ensureRenderer()) {
            this.setState(CurlOverlayState.FALLBACK);
            return;
        }

        const key = { front, back, width, height };
        if (
            sameKey(this.textureKey, key) &&
            (this.state === CurlOverlayState.PREPARING ||
                this.state === CurlOverlayState.READY ||
                this.state === CurlOverlayState.FALLBACK)
        )
            return;

        this.textureKey = key;
        this.setState(CurlOverlayState.PREPARING);
        const generation = ++this.generation;
        const frontSource = Promise.resolve(front.getTextureSource(width, height));
        const backSource =
            back === null
                ? Promise.resolve<TexImageSource | null>(null)
                : Promise.resolve(back.getTextureSource(width, height));

        void Promise.all([frontSource, backSource])
            .then(([resolvedFront, resolvedBack]) => {
                if (generation !== this.generation) return;
                if (resolvedFront === null) {
                    this.setState(CurlOverlayState.FALLBACK);
                    return;
                }

                try {
                    this.renderer.setTextures(resolvedFront, resolvedBack);
                    this.setState(CurlOverlayState.READY);
                } catch {
                    this.setState(CurlOverlayState.FALLBACK);
                }
            })
            .catch(() => {
                if (generation !== this.generation) return;
                this.setState(CurlOverlayState.FALLBACK);
            });
    }

    public isReady(): boolean {
        return (
            this.state === CurlOverlayState.READY &&
            this.renderer !== null &&
            !this.permanentlyUnavailable
        );
    }

    public getState(): CurlOverlayState {
        return this.state;
    }

    public draw(
        fold: ReflectionCurlFold,
        direction: FlipDirection,
        rect: PageRect,
        radius: number,
        shadowStrength: number,
    ): boolean {
        if (!this.isReady()) return false;

        const paddingY = Math.round(rect.height * CURL_VERTICAL_PADDING_RATIO);
        this.canvas.style.display = 'block';
        this.canvas.style.left = `${rect.left}px`;
        this.canvas.style.top = `${rect.top - paddingY}px`;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height + paddingY * 2}px`;

        try {
            this.renderer.resize(
                rect.pageWidth,
                rect.height,
                Math.min(window.devicePixelRatio || 1, 2),
            );
            this.renderer.draw(fold, direction === FlipDirection.FORWARD, radius, shadowStrength);
            return true;
        } catch {
            this.hide();
            this.setState(CurlOverlayState.FALLBACK);
            return false;
        }
    }

    public hide(): void {
        this.canvas.style.display = 'none';
    }

    public reset(): void {
        this.generation += 1;
        this.hide();
        if (this.permanentlyUnavailable) {
            this.state = CurlOverlayState.FALLBACK;
        } else if (this.state !== CurlOverlayState.READY) {
            this.state = CurlOverlayState.IDLE;
            this.textureKey = null;
        }
    }

    public destroy(): void {
        this.generation += 1;
        this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
        this.renderer?.dispose();
        this.renderer = null;
        this.canvas.remove();
    }
}
