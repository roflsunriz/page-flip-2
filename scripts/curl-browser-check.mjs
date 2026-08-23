const pageUrl = process.argv[2] ?? 'http://127.0.0.1:4173/';
const outputDirectory = process.argv[3] ?? process.cwd();
const cdpBaseUrl = process.argv[4] ?? 'http://127.0.0.1:9229';

const targetResponse = await fetch(`${cdpBaseUrl}/json/new?${encodeURIComponent(pageUrl)}`, {
    method: 'PUT',
});
if (!targetResponse.ok) throw new Error(`CDP target creation failed: ${targetResponse.status}`);

const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const eventWaiters = new Map();
const browserErrors = [];
let messageId = 0;

await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) {
        const waiter = pending.get(message.id);
        if (waiter) {
            pending.delete(message.id);
            if (message.error) waiter.reject(new Error(message.error.message));
            else waiter.resolve(message.result);
        }
        return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
        browserErrors.push(
            message.params.exceptionDetails.exception?.description ??
                message.params.exceptionDetails.text,
        );
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        browserErrors.push(message.params.entry.text);
    }

    const waiters = eventWaiters.get(message.method) ?? [];
    eventWaiters.delete(message.method);
    for (const resolve of waiters) resolve(message.params);
});

const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
        const id = ++messageId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });

const waitForEvent = (method) =>
    new Promise((resolve) => {
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push(resolve);
        eventWaiters.set(method, waiters);
    });

const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
};

const screenshot = async (name) => {
    const result = await command('Page.captureScreenshot', { format: 'png' });
    await Bun.write(`${outputDirectory}/${name}`, Buffer.from(result.data, 'base64'));
};

let waitIndex = 0;
const waitFor = async (expression, timeout = 5000) => {
    const currentWait = ++waitIndex;
    const started = performance.now();
    while (performance.now() - started < timeout) {
        if (await evaluate(expression)) return;
        await Bun.sleep(50);
    }
    throw new Error(`Timed out in wait ${currentWait}: ${expression}`);
};

const drag = async (key, edge, distanceRatio) => {
    const points = await evaluate(`(() => {
        const isCanvas = ${JSON.stringify(key)} === 'canvas';
        const root = isCanvas
            ? document.querySelector('[data-canvas-book]')
            : document.querySelector('[data-book="${key}"]');
        root.scrollIntoView({ block: 'center' });
        const surface = isCanvas ? root.querySelector('.page-flip-2__canvas') : root.querySelector('.page-flip-2__block');
        const surfaceRect = surface.getBoundingClientRect();
        const book = isCanvas ? window.canvasBook : window.demoBooks[${JSON.stringify(key)}];
        const rect = book.getRender().getRect();
        const fromRight = ${JSON.stringify(edge)} === 'right';
        const startX = surfaceRect.left + rect.left + (fromRight ? rect.width - 3 : 3);
        const direction = fromRight ? -1 : 1;
        return {
            start: { x: startX, y: surfaceRect.top + rect.top + rect.height * 0.72 },
            target: { x: startX + direction * rect.pageWidth * ${distanceRatio}, y: surfaceRect.top + rect.top + rect.height * 0.45 },
        };
    })()`);
    await Bun.sleep(100);
    await command('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: points.start.x,
        y: points.start.y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
    });
    await command('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: points.target.x,
        y: points.target.y,
        button: 'left',
        buttons: 1,
    });
    return points.target;
};

const hoverCorner = async (key, edge, corner) => {
    const point = await evaluate(`(() => {
        const root = document.querySelector('[data-book="${key}"]');
        root.scrollIntoView({ block: 'center' });
        const surface = root.querySelector('.page-flip-2__block');
        const surfaceRect = surface.getBoundingClientRect();
        const rect = window.demoBooks[${JSON.stringify(key)}].getRender().getRect();
        return {
            x: surfaceRect.left + rect.left + (${JSON.stringify(edge)} === 'right' ? rect.width - 2 : 2),
            y: surfaceRect.top + rect.top + (${JSON.stringify(corner)} === 'bottom' ? rect.height - 2 : 2),
        };
    })()`);
    await Bun.sleep(100);
    await command('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: point.x,
        y: point.y,
    });
    return point;
};

const dragFromSpine = async (key, edge, verticalRatio) => {
    const points = await evaluate(`(() => {
        const root = document.querySelector('[data-book="${key}"]');
        root.scrollIntoView({ block: 'center' });
        const surface = root.querySelector('.page-flip-2__block');
        const surfaceRect = surface.getBoundingClientRect();
        const rect = window.demoBooks[${JSON.stringify(key)}].getRender().getRect();
        const fromRight = ${JSON.stringify(edge)} === 'right';
        const spineX = surfaceRect.left + rect.left + rect.width / 2;
        const freeEdgeX = surfaceRect.left + rect.left + (fromRight ? rect.width : 0);
        return {
            start: {
                x: spineX + (fromRight ? 3 : -3),
                y: surfaceRect.top + rect.top + rect.height * ${verticalRatio},
            },
            target: {
                x: freeEdgeX + (fromRight ? -rect.pageWidth * 0.15 : rect.pageWidth * 0.15),
                y: surfaceRect.top + rect.top + rect.height * ${verticalRatio},
            },
        };
    })()`);
    await Bun.sleep(100);
    await command('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: points.start.x,
        y: points.start.y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
    });
    await command('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: points.target.x,
        y: points.target.y,
        button: 'left',
        buttons: 1,
    });
    return points.target;
};

const addPointerMarker = (point) =>
    evaluate(`(() => {
        document.querySelector('[data-curl-pointer-marker]')?.remove();
        const marker = document.createElement('div');
        marker.setAttribute('data-curl-pointer-marker', '');
        marker.style.cssText = 'position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #00ff66;border-radius:50%;background:#001a0dcc;z-index:99999;pointer-events:none;';
        marker.style.left = '${point.x}px';
        marker.style.top = '${point.y}px';
        document.body.appendChild(marker);
    })()`);

const release = (point) =>
    command('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: point.x,
        y: point.y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
    });

await command('Runtime.enable');
await command('Page.enable');
await command('Log.enable');
await command('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
});
const loaded = waitForEvent('Page.loadEventFired');
await command('Page.navigate', { url: pageUrl });
await loaded;
await Bun.sleep(500);

await evaluate(`(() => {
    const style = document.createElement('style');
    style.setAttribute('data-corner-diagnostic', '');
    style.textContent = '[data-book] [data-page]:nth-child(even) { background: linear-gradient(to bottom, #ff1744 0 50%, #2979ff 50% 100%); }';
    document.head.appendChild(style);
})()`);
const bottomCornerPoint = await hoverCorner('ltr', 'right', 'bottom');
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
const bottomCornerState = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    canvasDisplay: document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display,
})`);
await addPointerMarker(bottomCornerPoint);
await screenshot('curl-corner-bottom.png');
await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
await waitFor(`window.demoBooks.ltr.getState() === 'read'`);

const topCornerPoint = await hoverCorner('ltr', 'right', 'top');
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
const topCornerState = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    canvasDisplay: document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display,
})`);
await addPointerMarker(topCornerPoint);
await screenshot('curl-corner-top.png');
await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
await waitFor(`window.demoBooks.ltr.getState() === 'read'`);

const spineDragStates = {};
for (const diagnostic of [
    { name: 'ltr-spine-top', key: 'ltr', edge: 'right', verticalRatio: 0.15 },
    { name: 'ltr-spine-upper-mid', key: 'ltr', edge: 'right', verticalRatio: 0.4 },
    { name: 'ltr-spine-lower-mid', key: 'ltr', edge: 'right', verticalRatio: 0.6 },
    { name: 'ltr-spine-bottom', key: 'ltr', edge: 'right', verticalRatio: 0.85 },
    { name: 'rtl-spine-top', key: 'rtl', edge: 'left', verticalRatio: 0.15 },
    { name: 'rtl-spine-upper-mid', key: 'rtl', edge: 'left', verticalRatio: 0.4 },
    { name: 'rtl-spine-lower-mid', key: 'rtl', edge: 'left', verticalRatio: 0.6 },
    { name: 'rtl-spine-bottom', key: 'rtl', edge: 'left', verticalRatio: 0.85 },
]) {
    const target = await dragFromSpine(diagnostic.key, diagnostic.edge, diagnostic.verticalRatio);
    await waitFor(
        `document.querySelector('[data-book="${diagnostic.key}"] .page-flip-2__curl-canvas').style.display === 'block'`,
    );
    await addPointerMarker(target);
    await screenshot(`curl-${diagnostic.name}.png`);
    spineDragStates[diagnostic.name] = await evaluate(`({
        state: window.demoBooks[${JSON.stringify(diagnostic.key)}].getState(),
        canvasDisplay: document.querySelector('[data-book="${diagnostic.key}"] .page-flip-2__curl-canvas').style.display,
    })`);
    await release(target);
    await waitFor(`window.demoBooks[${JSON.stringify(diagnostic.key)}].getState() === 'read'`);
}
await evaluate(`(() => {
    document.querySelector('[data-curl-pointer-marker]')?.remove();
    document.querySelector('[data-corner-diagnostic]')?.remove();
    window.demoBooks.ltr.destroy();
    window.demoBooks.rtl.destroy();
    window.demoBooks = window.resetDemoBooks();
})()`);
await Bun.sleep(200);

const htmlTextureProbe = await evaluate(`(async () => {
    const rect = window.demoBooks.ltr.getRender().getRect();
    const started = performance.now();
    const source = await window.demoBooks.ltr.getPage(0).getTextureSource(rect.pageWidth, rect.height);
    return {
        ready: source !== null,
        duration: performance.now() - started,
        width: source?.naturalWidth ?? source?.width ?? 0,
        height: source?.naturalHeight ?? source?.height ?? 0,
    };
})()`);

await evaluate(`(() => {
    const page = window.demoBooks.ltr.getPage(2);
    const original = page.getTextureSource.bind(page);
    page.__curlOriginalTextureSource = original;
    page.__curlTextureCalls = 0;
    page.getTextureSource = async (...args) => {
        page.__curlTextureCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 350));
        return original(...args);
    };
})()`);

const ltrPoint = await drag('ltr', 'right', 0.9);
for (let move = 0; move < 4; move += 1) {
    await Bun.sleep(20);
    await command('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: ltrPoint.x,
        y: ltrPoint.y,
        button: 'left',
        buttons: 1,
    });
}
await Bun.sleep(75);
const ltrWhilePreparing = await evaluate(`(() => {
    const root = document.querySelector('[data-book="ltr"]');
    const pages = [...root.querySelectorAll('[data-page]')];
    const shadows = [...root.querySelectorAll(
        '.page-flip-2__outer-shadow, .page-flip-2__inner-shadow, .page-flip-2__hard-shadow, .page-flip-2__hard-inner-shadow'
    )];
    return {
        canvasDisplay: root.querySelector('.page-flip-2__curl-canvas').style.display,
        currentPageDisplay: pages[1].style.display,
        legacyFlippingDisplay: pages[2].style.display,
        shadowDisplays: shadows.map((shadow) => shadow.style.display),
    };
})()`);
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
const texturePreparationCalls = await evaluate(`(() => {
    const page = window.demoBooks.ltr.getPage(2);
    const calls = page.__curlTextureCalls;
    page.getTextureSource = page.__curlOriginalTextureSource;
    delete page.__curlOriginalTextureSource;
    delete page.__curlTextureCalls;
    return calls;
})()`);
await evaluate(`(() => {
    const marker = document.createElement('div');
    marker.setAttribute('data-curl-pointer-marker', '');
    marker.style.cssText = 'position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #00ff66;border-radius:50%;background:#001a0dcc;z-index:99999;pointer-events:none;';
    marker.style.left = '${ltrPoint.x}px';
    marker.style.top = '${ltrPoint.y}px';
    document.body.appendChild(marker);
})()`);
await screenshot('curl-ltr.png');
await evaluate(`document.querySelector('[data-curl-pointer-marker]')?.remove()`);
const ltrDuring = await evaluate(`(() => {
    const root = document.querySelector('[data-book="ltr"]');
    const pages = [...root.querySelectorAll('[data-page]')];
    const shadows = [...root.querySelectorAll(
        '.page-flip-2__outer-shadow, .page-flip-2__inner-shadow, .page-flip-2__hard-shadow, .page-flip-2__hard-inner-shadow'
    )];
    return {
        state: window.demoBooks.ltr.getState(),
        page: window.demoBooks.ltr.getCurrentPageIndex(),
        canvases: root.querySelectorAll('.page-flip-2__curl-canvas').length,
        legacyFlippingDisplay: pages[2].style.display,
        shadowDisplays: shadows.map((shadow) => shadow.style.display),
    };
})()`);
await release(ltrPoint);
await Bun.sleep(250);
const ltrAfterCancel = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    page: window.demoBooks.ltr.getCurrentPageIndex(),
})`);
const ltrCompletePoint = await drag('ltr', 'right', 1.2);
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await release(ltrCompletePoint);
await Bun.sleep(300);
const ltrAfterComplete = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    page: window.demoBooks.ltr.getCurrentPageIndex(),
})`);

const rtlPoint = await drag('rtl', 'left', 0.9);
await waitFor(
    `document.querySelector('[data-book="rtl"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await screenshot('curl-rtl.png');
const rtlDuring = await evaluate(`({
    state: window.demoBooks.rtl.getState(),
    page: window.demoBooks.rtl.getCurrentPageIndex(),
})`);
await release(rtlPoint);
await Bun.sleep(250);
const rtlCompletePoint = await drag('rtl', 'left', 1.2);
await waitFor(
    `document.querySelector('[data-book="rtl"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await release(rtlCompletePoint);
await Bun.sleep(300);
const rtlAfterComplete = await evaluate(`({
    state: window.demoBooks.rtl.getState(),
    page: window.demoBooks.rtl.getCurrentPageIndex(),
})`);

const canvasPoint = await drag('canvas', 'left', 0.9);
await waitFor(
    `document.querySelector('[data-canvas-book] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await screenshot('curl-canvas-rtl.png');
const canvasDuring = await evaluate(`({
    state: window.canvasBook.getState(),
    page: window.canvasBook.getCurrentPageIndex(),
})`);
await release(canvasPoint);
await Bun.sleep(250);
const canvasCompletePoint = await drag('canvas', 'left', 1.2);
await waitFor(
    `document.querySelector('[data-canvas-book] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await release(canvasCompletePoint);
await Bun.sleep(300);
const canvasAfterComplete = await evaluate(`({
    state: window.canvasBook.getState(),
    page: window.canvasBook.getCurrentPageIndex(),
})`);

await command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
});
await Bun.sleep(200);
const mobileLtrPoint = await drag('ltr', 'right', 0.9);
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await screenshot('curl-mobile-ltr.png');
const mobileLtr = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    page: window.demoBooks.ltr.getCurrentPageIndex(),
    orientation: window.demoBooks.ltr.getOrientation(),
})`);
await release(mobileLtrPoint);
await Bun.sleep(250);

const mobileRtlPoint = await drag('rtl', 'left', 0.9);
await waitFor(
    `document.querySelector('[data-book="rtl"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
const mobileRtl = await evaluate(`({
    state: window.demoBooks.rtl.getState(),
    page: window.demoBooks.rtl.getCurrentPageIndex(),
    orientation: window.demoBooks.rtl.getOrientation(),
})`);
await release(mobileRtlPoint);
await Bun.sleep(250);

await evaluate(`(() => {
    document.querySelector('[data-book="ltr"]').scrollIntoView({ block: 'center' });
    window.demoBooks.ltr.getSettings().flippingTime = 1000;
    window.demoBooks.ltr.flipNext();
})()`);
await waitFor(
    `document.querySelector('[data-book="ltr"] .page-flip-2__curl-canvas').style.display === 'block'`,
);
await Bun.sleep(250);
await screenshot('curl-programmatic-ltr.png');
await Bun.sleep(1100);
const programmaticLtr = await evaluate(`({
    state: window.demoBooks.ltr.getState(),
    page: window.demoBooks.ltr.getCurrentPageIndex(),
})`);

const failures = [];
if (bottomCornerState.state !== 'fold_corner' || bottomCornerState.canvasDisplay !== 'block') {
    failures.push('The bottom corner hover must render through the rounded curl');
}
if (topCornerState.state !== 'fold_corner' || topCornerState.canvasDisplay !== 'block') {
    failures.push('The top corner hover must render through the rounded curl');
}
for (const [name, state] of Object.entries(spineDragStates)) {
    if (state.state !== 'user_fold' || state.canvasDisplay !== 'block') {
        failures.push(`${name} must render through the rounded curl`);
    }
}
if (!htmlTextureProbe.ready || htmlTextureProbe.width <= 0 || htmlTextureProbe.height <= 0) {
    failures.push('The lazy HTML texture chunk must produce a drawable page image');
}
if (
    ltrWhilePreparing.canvasDisplay !== 'none' ||
    ltrWhilePreparing.currentPageDisplay !== 'block' ||
    ltrWhilePreparing.legacyFlippingDisplay !== 'none' ||
    ltrWhilePreparing.shadowDisplays.some((display) => display !== 'none')
) {
    failures.push('Texture preparation must freeze the current page without legacy curl remnants');
}
if (texturePreparationCalls !== 1) {
    failures.push('Repeated pointer moves must not restart the same page texture preparation');
}
if (ltrDuring.state !== 'user_fold' || ltrDuring.page !== 0 || ltrDuring.canvases !== 1) {
    failures.push('LTR must use one rounded canvas while dragging');
}
if (
    ltrDuring.legacyFlippingDisplay !== 'none' ||
    ltrDuring.shadowDisplays.some((display) => display !== 'none')
) {
    failures.push('Rounded rendering must hide the legacy page and every legacy shadow');
}
if (ltrAfterCancel.state !== 'read' || ltrAfterCancel.page !== 0) {
    failures.push('LTR drag below the threshold must settle back without changing the page');
}
if (ltrAfterComplete.state !== 'read' || ltrAfterComplete.page !== 2) {
    failures.push('LTR drag beyond the threshold must complete the turn');
}
if (rtlDuring.state !== 'user_fold' || rtlDuring.page !== 0) {
    failures.push('RTL must use the mirrored rounded curl while dragging');
}
if (rtlAfterComplete.state !== 'read' || rtlAfterComplete.page !== 2) {
    failures.push('RTL drag beyond the threshold must complete the logical next turn');
}
if (canvasDuring.state !== 'user_fold' || canvasDuring.page !== 0) {
    failures.push('Canvas RTL must use the rounded curl while dragging');
}
if (canvasAfterComplete.state !== 'read' || canvasAfterComplete.page !== 2) {
    failures.push('Canvas RTL drag beyond the threshold must complete the logical next turn');
}
if (
    mobileLtr.state !== 'user_fold' ||
    mobileLtr.page !== 2 ||
    mobileLtr.orientation !== 'portrait'
) {
    failures.push('Mobile LTR must keep the rounded curl in portrait mode');
}
if (
    mobileRtl.state !== 'user_fold' ||
    mobileRtl.page !== 2 ||
    mobileRtl.orientation !== 'portrait'
) {
    failures.push('Mobile RTL must keep the mirrored rounded curl in portrait mode');
}
if (programmaticLtr.state !== 'read' || programmaticLtr.page !== 3) {
    failures.push('Programmatic LTR turns must use the rounded curl and reach the target page');
}
if (browserErrors.length > 0) failures.push(`browser errors: ${browserErrors.join('; ')}`);

socket.close();
await fetch(`${cdpBaseUrl}/json/close/${target.id}`);

if (failures.length > 0) {
    throw new Error(failures.join('\n'));
}
console.log(
    JSON.stringify(
        {
            bottomCornerState,
            topCornerState,
            spineDragStates,
            htmlTextureProbe,
            texturePreparationCalls,
            ltrWhilePreparing,
            ltrDuring,
            ltrAfterCancel,
            ltrAfterComplete,
            rtlDuring,
            rtlAfterComplete,
            canvasDuring,
            canvasAfterComplete,
            mobileLtr,
            mobileRtl,
            programmaticLtr,
        },
        null,
        2,
    ),
);
