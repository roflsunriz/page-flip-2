const pageUrl = process.argv[2] ?? 'http://127.0.0.1:4173/';
const cdpBaseUrl = process.argv[3] ?? process.env['PAGE_FLIP_2_CDP_URL'] ?? 'http://127.0.0.1:9222';

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
        if (waiter !== undefined) {
            pending.delete(message.id);
            if (message.error !== undefined) waiter.reject(new Error(message.error.message));
            else waiter.resolve(message.result);
        }
        return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
        browserErrors.push(message.params.exceptionDetails.text);
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
    if (result.exceptionDetails !== undefined) {
        const description = result.exceptionDetails.exception?.description;
        throw new Error(description ?? JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
};

const inspect = () =>
    evaluate(`(() => ({
        styleCount: document.querySelectorAll('style[data-page-flip-2-styles]').length,
        viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        books: Object.fromEntries(Object.entries(window.demoBooks).map(([key, book]) => {
            const root = document.querySelector('[data-book="' + key + '"]');
            const pages = [...root.querySelectorAll('[data-page]')];
            return [key, {
                currentPage: book.getCurrentPageIndex(),
                state: book.getState(),
                orientation: book.getOrientation(),
                root: root.getBoundingClientRect().toJSON(),
                pageClasses: pages.map((page) => [...page.classList]),
                pageDensities: book.getPageCollection().getPages().map((page) => ({
                    created: page.getDensity(),
                    drawing: page.getDrawingDensity(),
                })),
            }];
        })),
        canvas: {
            currentPage: window.canvasBook.getCurrentPageIndex(),
            orientation: window.canvasBook.getOrientation(),
            canvasCount: document.querySelectorAll('[data-canvas-book] canvas').length,
        },
    }))()`);

await command('Runtime.enable');
await command('Page.enable');
await command('Log.enable');

const loaded = waitForEvent('Page.loadEventFired');
await command('Page.navigate', { url: pageUrl });
await loaded;
await Bun.sleep(100);

await command('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
});
await Bun.sleep(100);
const desktop = await inspect();

await evaluate(`document.querySelector('[data-book="ltr"]').style.width = '300px'`);
await Bun.sleep(100);
const containerResized = await inspect();
await evaluate(`document.querySelector('[data-book="ltr"]').style.width = '100%'`);
await Bun.sleep(100);

await evaluate(`(() => {
    document.querySelector('[data-action="next"][data-target="ltr"]').click();
    document.querySelector('[data-action="next"][data-target="rtl"]').click();
    window.canvasBook.flipNext();
})()`);
await Bun.sleep(400);
const afterTurn = await inspect();

const hoverCorner = async (key, edge) => {
    const point = await evaluate(`(() => {
        const rect = document
            .querySelector('[data-book="${key}"] .page-flip-2__block')
            .getBoundingClientRect();
        const pageRect = window.demoBooks["${key}"].getRender().getRect();
        return {
            x: rect.left + ${edge === 'right' ? 'pageRect.left + pageRect.width - 1' : 'pageRect.left + 1'},
            y: rect.top + pageRect.top + 1,
        };
    })()`);
    await command('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: point.x,
        y: point.y,
    });
    await evaluate(
        `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    );
    return inspect();
};

const ltrFinalHover = await hoverCorner('ltr', 'right');
const rtlFinalHover = await hoverCorner('rtl', 'left');

await command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
});
await Bun.sleep(100);
const mobile = await inspect();

const destroyed = await evaluate(`(() => {
    window.demoBooks.ltr.destroy();
    window.demoBooks.rtl.destroy();
    window.canvasBook.destroy();
    const books = Object.fromEntries(['ltr', 'rtl'].map((key) => {
        const root = document.querySelector('[data-book="' + key + '"]');
        return [key, {
            connected: root.isConnected,
            directPages: root.querySelectorAll(':scope > [data-page]').length,
            generatedNodes: root.querySelectorAll('.page-flip-2__wrapper, .page-flip-2__item').length,
        }];
    }));
    const canvasRoot = document.querySelector('[data-canvas-book]');
    return {
        ...books,
        canvas: {
            connected: canvasRoot.isConnected,
            canvasCount: canvasRoot.querySelectorAll('canvas').length,
        },
    };
})()`);
await evaluate('(() => { window.demoBooks = window.resetDemoBooks(); })()');
await evaluate('(() => { window.canvasBook = window.resetCanvasBook(); })()');
await Bun.sleep(100);
const reinitialized = await inspect();

const assertions = [
    [desktop.styleCount === 1, 'bundle styles must be injected exactly once'],
    [desktop.overflow === false, 'desktop must not overflow horizontally'],
    [desktop.books.ltr.currentPage === 0, 'LTR must start at logical page 0'],
    [desktop.books.rtl.currentPage === 0, 'RTL must start at logical page 0'],
    [desktop.canvas.currentPage === 0, 'Canvas RTL must start at logical page 0'],
    [desktop.canvas.canvasCount === 1, 'Canvas mode must create one canvas'],
    [desktop.books.ltr.pageClasses[0].includes('--left'), 'LTR page 0 must be on the left'],
    [desktop.books.rtl.pageClasses[0].includes('--right'), 'RTL page 0 must be on the right'],
    [
        containerResized.books.ltr.orientation === 'portrait',
        'container-only resize must update orientation',
    ],
    [afterTurn.books.ltr.currentPage === 2, 'LTR next must advance to logical page 2'],
    [afterTurn.books.rtl.currentPage === 2, 'RTL next must advance to logical page 2'],
    [afterTurn.canvas.currentPage === 2, 'Canvas RTL next must advance to logical page 2'],
    [
        ltrFinalHover.books.ltr.pageDensities[4].created === 'soft',
        'LTR final-page hover must use the same soft-page animation as regular pages',
    ],
    [ltrFinalHover.books.ltr.state === 'fold_corner', 'LTR final-page hover must start folding'],
    [
        rtlFinalHover.books.rtl.pageDensities[4].created === 'soft',
        'RTL final-page hover must use the same soft-page animation as regular pages',
    ],
    [rtlFinalHover.books.rtl.state === 'fold_corner', 'RTL final-page hover must start folding'],
    [
        afterTurn.books.rtl.pageClasses.slice(2, 4).every((classes) => classes.includes('--soft')),
        'RTL animation must restore soft-page density',
    ],
    [mobile.overflow === false, 'mobile must not overflow horizontally'],
    [mobile.books.ltr.orientation === 'portrait', 'LTR must switch to portrait on mobile'],
    [mobile.books.rtl.orientation === 'portrait', 'RTL must switch to portrait on mobile'],
    [mobile.canvas.orientation === 'portrait', 'Canvas RTL must switch to portrait on mobile'],
    [mobile.books.ltr.pageClasses[2].includes('--right'), 'LTR portrait must use the right half'],
    [mobile.books.rtl.pageClasses[2].includes('--left'), 'RTL portrait must use the left half'],
    [destroyed.ltr.connected && destroyed.rtl.connected, 'destroy must retain caller-owned roots'],
    [
        destroyed.ltr.directPages === 5 && destroyed.rtl.directPages === 5,
        'destroy must restore source pages',
    ],
    [
        destroyed.ltr.generatedNodes === 0 && destroyed.rtl.generatedNodes === 0,
        'destroy must remove generated DOM',
    ],
    [
        destroyed.canvas.connected && destroyed.canvas.canvasCount === 0,
        'Canvas destroy must retain its root and remove generated canvas',
    ],
    [
        reinitialized.books.ltr.currentPage === 0 && reinitialized.books.rtl.currentPage === 0,
        'destroyed roots must support reinitialization',
    ],
    [reinitialized.canvas.currentPage === 0, 'Canvas root must support reinitialization'],
    [browserErrors.length === 0, `browser errors: ${browserErrors.join('; ')}`],
];

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

socket.close();
await fetch(`${cdpBaseUrl}/json/close/${target.id}`);

if (failures.length > 0) {
    console.error(
        JSON.stringify(
            {
                desktop,
                containerResized,
                afterTurn,
                ltrFinalHover,
                rtlFinalHover,
                mobile,
                destroyed,
                reinitialized,
                browserErrors,
            },
            null,
            2,
        ),
    );
    throw new Error(`Browser smoke test failed:\n- ${failures.join('\n- ')}`);
}

console.log(
    JSON.stringify({
        desktop: {
            ltr: afterTurn.books.ltr.currentPage,
            rtl: afterTurn.books.rtl.currentPage,
        },
        finalHover: {
            ltr: {
                state: ltrFinalHover.books.ltr.state,
                finalDensity: ltrFinalHover.books.ltr.pageDensities[4],
            },
            rtl: {
                state: rtlFinalHover.books.rtl.state,
                finalDensity: rtlFinalHover.books.rtl.pageDensities[4],
            },
        },
        mobile: {
            ltr: mobile.books.ltr.orientation,
            rtl: mobile.books.rtl.orientation,
        },
        browserErrors,
    }),
);
