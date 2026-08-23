import { afterEach, expect, it, mock } from 'bun:test';

import type { PageFlip } from '../src';
import { CanvasRender } from '../src/Render/CanvasRender';
import { Settings } from '../src/Settings';

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    mock.restore();
});

it('paints the configured Canvas background without drawing a spine shadow', () => {
    let queuedFrame: FrameRequestCallback | null = null;
    globalThis.requestAnimationFrame = mock((callback: FrameRequestCallback) => {
        queuedFrame = callback;
        return 1;
    });

    const fillRect = mock(() => undefined);
    const context = {
        fillStyle: '',
        fillRect,
        save: mock(() => undefined),
        restore: mock(() => undefined),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
        width: 200,
        height: 300,
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const settings = new Settings().getSettings({
        width: 100,
        height: 200,
        backgroundColor: '#123456',
        drawShadow: false,
    });
    const app = {
        getSettings: () => settings,
        getUI: () => ({
            getDistElement: () => ({ offsetWidth: 200, offsetHeight: 300 }),
        }),
        isRtl: () => false,
        updateOrientation: (): void => undefined,
    } as unknown as PageFlip;
    const render = new CanvasRender(app, settings, canvas);

    render.start();
    queuedFrame?.(performance.now());

    expect(context.fillStyle).toBe('#123456');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 200, 300);

    render.stop();
});

it('executes the terminal animation frame when a duration is shorter than one browser frame', () => {
    const queuedFrames: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = mock((callback: FrameRequestCallback) => {
        queuedFrames.push(callback);
        return queuedFrames.length;
    });

    const context = {
        fillStyle: '',
        fillRect: mock(() => undefined),
        save: mock(() => undefined),
        restore: mock(() => undefined),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
        width: 200,
        height: 300,
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const settings = new Settings().getSettings({
        width: 100,
        height: 200,
        drawShadow: false,
    });
    const app = {
        getSettings: () => settings,
        getUI: () => ({
            getDistElement: () => ({ offsetWidth: 200, offsetHeight: 300 }),
        }),
        isRtl: () => false,
        updateOrientation: (): void => undefined,
    } as unknown as PageFlip;
    const render = new CanvasRender(app, settings, canvas);
    const firstFrame = mock(() => undefined);
    const terminalFrame = mock(() => undefined);
    const completed = mock(() => undefined);

    render.start();
    queuedFrames.shift()?.(0);
    render.startAnimation([firstFrame, terminalFrame], 1, completed);
    queuedFrames.shift()?.(10);
    queuedFrames.shift()?.(26);

    expect(firstFrame).toHaveBeenCalledTimes(1);
    expect(terminalFrame).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledTimes(1);

    render.stop();
});
