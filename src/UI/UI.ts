import { PageFlip } from '../PageFlip';
import { Point } from '../BasicTypes';
import { DisplayMode, FlipSetting, ReadingDirection, SizeType } from '../Settings';
import { FlipCorner, FlippingState } from '../Flip/Flip';
import { Orientation } from '../Render/Render';

type SwipeData = {
    point: Point;
    time: number;
};

type InlineStyleState = {
    priority: string;
    value: string;
};

/**
 * UI Class, represents work with DOM
 */
export abstract class UI {
    protected readonly parentElement: HTMLElement;

    protected readonly app: PageFlip;
    protected readonly wrapper: HTMLElement;
    protected distElement: HTMLElement;

    private touchPoint: SwipeData = null;
    private readonly swipeTimeout = 250;
    private readonly swipeDistance: number;
    private readonly initialDirectionAttribute: string | null;
    private readonly initiallyHadParentClass: boolean;
    private readonly initialInlineStyles = new Map<string, InlineStyleState>();
    private touchTimeoutId: number = null;
    private resizeFrameId: number = null;
    private resizeObserver: ResizeObserver = null;

    private onResize = (): void => {
        if (this.resizeFrameId !== null) cancelAnimationFrame(this.resizeFrameId);
        this.resizeFrameId = requestAnimationFrame(() => {
            this.resizeFrameId = null;
            this.app.update();
        });
    };

    /**
     * @constructor
     *
     * @param {HTMLElement} inBlock - Root HTML Element
     * @param {PageFlip} app - PageFlip instanse
     * @param {FlipSetting} setting - Configuration object
     */
    protected constructor(inBlock: HTMLElement, app: PageFlip, setting: FlipSetting) {
        this.parentElement = inBlock;
        this.initiallyHadParentClass = inBlock.classList.contains('page-flip-2__parent');
        this.initialDirectionAttribute = inBlock.getAttribute('data-page-flip-2-reading-direction');

        for (const property of ['min-width', 'min-height', 'width', 'max-width', 'display']) {
            this.initialInlineStyles.set(property, {
                value: inBlock.style.getPropertyValue(property),
                priority: inBlock.style.getPropertyPriority(property),
            });
        }

        inBlock.classList.add('page-flip-2__parent');
        inBlock.setAttribute('data-page-flip-2-reading-direction', setting.readingDirection);

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'page-flip-2__wrapper';
        inBlock.prepend(this.wrapper);

        this.app = app;

        const k =
            setting.displayMode === DisplayMode.PORTRAIT ||
            (setting.displayMode === DisplayMode.AUTO && setting.usePortrait)
                ? 1
                : 2;

        // Setting block sizes based on configuration
        inBlock.style.minWidth = setting.minWidth * k + 'px';
        inBlock.style.minHeight = setting.minHeight + 'px';

        if (setting.size === SizeType.FIXED) {
            inBlock.style.minWidth = setting.width * k + 'px';
            inBlock.style.minHeight = setting.height + 'px';
        }

        if (setting.autoSize) {
            inBlock.style.width = '100%';
            inBlock.style.maxWidth = setting.maxWidth * 2 + 'px';
        }

        inBlock.style.display = 'block';

        this.swipeDistance = setting.swipeDistance;
    }

    /**
     * Destructor. Remove all HTML elements and all event handlers
     */
    public destroy(): void {
        this.removeHandlers();
        if (this.touchTimeoutId !== null) window.clearTimeout(this.touchTimeoutId);
        if (this.resizeFrameId !== null) cancelAnimationFrame(this.resizeFrameId);

        this.distElement.remove();
        this.wrapper.remove();
        if (!this.initiallyHadParentClass) {
            this.parentElement.classList.remove('page-flip-2__parent');
        }

        for (const [property, state] of this.initialInlineStyles) {
            if (state.value === '') this.parentElement.style.removeProperty(property);
            else this.parentElement.style.setProperty(property, state.value, state.priority);
        }

        if (this.initialDirectionAttribute === null) {
            this.parentElement.removeAttribute('data-page-flip-2-reading-direction');
        } else {
            this.parentElement.setAttribute(
                'data-page-flip-2-reading-direction',
                this.initialDirectionAttribute,
            );
        }
    }

    /**
     * Updating child components when resizing
     */
    public abstract update(): void;

    /**
     * Get parent element for book
     *
     * @returns {HTMLElement}
     */
    public getDistElement(): HTMLElement {
        return this.distElement;
    }

    /**
     * Get wrapper element
     *
     * @returns {HTMLElement}
     */
    public getWrapper(): HTMLElement {
        return this.wrapper;
    }

    /**
     * Updates styles and sizes based on book orientation
     *
     * @param {Orientation} orientation - New book orientation
     */
    public setOrientationStyle(orientation: Orientation): void {
        this.wrapper.classList.remove('--portrait', '--landscape');

        if (this.app.getSettings().autoSize) {
            const spreadWidth =
                orientation === Orientation.PORTRAIT
                    ? this.app.getSettings().width
                    : this.app.getSettings().width * 2;
            this.wrapper.style.aspectRatio = `${spreadWidth} / ${this.app.getSettings().height}`;
        }

        this.wrapper.classList.add(
            orientation === Orientation.PORTRAIT ? '--portrait' : '--landscape',
        );

        this.update();
    }

    protected removeHandlers(): void {
        window.removeEventListener('resize', this.onResize);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.distElement.removeEventListener('mousedown', this.onMouseDown);
        this.distElement.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('touchend', this.onTouchEnd);
    }

    protected setHandlers(): void {
        if (typeof ResizeObserver === 'function') {
            this.resizeObserver = new ResizeObserver(this.onResize);
            this.resizeObserver.observe(this.parentElement);
        } else {
            window.addEventListener('resize', this.onResize, false);
        }
        if (!this.app.getSettings().useMouseEvents) return;

        this.distElement.addEventListener('mousedown', this.onMouseDown);
        this.distElement.addEventListener('touchstart', this.onTouchStart);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('touchmove', this.onTouchMove, {
            passive: !this.app.getSettings().mobileScrollSupport,
        });
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('touchend', this.onTouchEnd);
    }

    /**
     * Convert global coordinates to relative book coordinates
     *
     * @param x
     * @param y
     */
    private getMousePos(x: number, y: number): Point {
        const rect = this.distElement.getBoundingClientRect();

        return {
            x: x - rect.left,
            y: y - rect.top,
        };
    }

    private checkTarget(target: EventTarget): boolean {
        if (!this.app.getSettings().clickEventForward) return true;

        return !(target instanceof Element && target.closest('a, button') !== null);
    }

    private onMouseDown = (e: MouseEvent): void => {
        if (this.checkTarget(e.target)) {
            const pos = this.getMousePos(e.clientX, e.clientY);

            this.app.startUserTouch(pos);

            e.preventDefault();
        }
    };

    private onTouchStart = (e: TouchEvent): void => {
        if (this.checkTarget(e.target)) {
            if (e.changedTouches.length > 0) {
                const t = e.changedTouches[0];
                const pos = this.getMousePos(t.clientX, t.clientY);

                this.touchPoint = {
                    point: pos,
                    time: Date.now(),
                };

                // part of swipe detection
                this.touchTimeoutId = window.setTimeout(() => {
                    this.touchTimeoutId = null;
                    if (this.touchPoint !== null) {
                        this.app.startUserTouch(pos);
                    }
                }, this.swipeTimeout);

                if (!this.app.getSettings().mobileScrollSupport) e.preventDefault();
            }
        }
    };

    private onMouseUp = (e: MouseEvent): void => {
        const pos = this.getMousePos(e.clientX, e.clientY);

        this.app.userStop(pos);
    };

    private onMouseMove = (e: MouseEvent): void => {
        const pos = this.getMousePos(e.clientX, e.clientY);

        this.app.userMove(pos, false);
    };

    private onTouchMove = (e: TouchEvent): void => {
        if (e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            const pos = this.getMousePos(t.clientX, t.clientY);

            if (this.app.getSettings().mobileScrollSupport) {
                if (this.touchPoint !== null) {
                    if (
                        Math.abs(this.touchPoint.point.x - pos.x) > 10 ||
                        this.app.getState() !== FlippingState.READ
                    ) {
                        if (e.cancelable) this.app.userMove(pos, true);
                    }
                }

                if (this.app.getState() !== FlippingState.READ) {
                    e.preventDefault();
                }
            } else {
                this.app.userMove(pos, true);
            }
        }
    };

    private onTouchEnd = (e: TouchEvent): void => {
        if (this.touchTimeoutId !== null) {
            window.clearTimeout(this.touchTimeoutId);
            this.touchTimeoutId = null;
        }

        if (e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            const pos = this.getMousePos(t.clientX, t.clientY);
            let isSwipe = false;

            // swipe detection
            if (this.touchPoint !== null) {
                const dx = pos.x - this.touchPoint.point.x;
                const distY = Math.abs(pos.y - this.touchPoint.point.y);

                if (
                    Math.abs(dx) > this.swipeDistance &&
                    distY < this.swipeDistance * 2 &&
                    Date.now() - this.touchPoint.time < this.swipeTimeout
                ) {
                    const corner =
                        this.touchPoint.point.y < this.app.getRender().getRect().height / 2
                            ? FlipCorner.TOP
                            : FlipCorner.BOTTOM;
                    const isNextPage =
                        this.app.getSettings().readingDirection === ReadingDirection.RTL
                            ? dx > 0
                            : dx < 0;

                    if (isNextPage) {
                        this.app.flipNext(corner);
                    } else {
                        this.app.flipPrev(corner);
                    }
                    isSwipe = true;
                }

                this.touchPoint = null;
            }

            this.app.userStop(pos, isSwipe);
        }
    };
}
