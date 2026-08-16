/**
 * Book size calculation type
 */
export const enum SizeType {
    /** Dimensions are fixed */
    FIXED = 'fixed',
    /** Dimensions are calculated based on the parent element */
    STRETCH = 'stretch',
}

export const ReadingDirection = {
    LTR: 'ltr',
    RTL: 'rtl',
} as const;

export type ReadingDirection = (typeof ReadingDirection)[keyof typeof ReadingDirection];

export const CoverDensity = {
    SOFT: 'soft',
    HARD: 'hard',
} as const;

export type CoverDensity = (typeof CoverDensity)[keyof typeof CoverDensity];

/**
 * Configuration object
 */
export interface FlipSetting {
    /** Page number from which to start viewing */
    startPage: number;
    /** Whether the book will be stretched under the parent element or not */
    size: SizeType;
    /** Logical order and physical turning direction of the book */
    readingDirection: ReadingDirection;

    width: number;
    height: number;

    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;

    /** Draw shadows or not when page flipping */
    drawShadow: boolean;
    /** Canvas color drawn behind image pages */
    backgroundColor: string;
    /** Flipping animation time */
    flippingTime: number;

    /** Enable switching to portrait mode */
    usePortrait: boolean;
    /** Initial value to z-index */
    startZIndex: number;
    /** If this value is true, the parent element will be equal to the size of the book */
    autoSize: boolean;
    /** Shadow intensity (1: max intensity, 0: hidden shadows) */
    maxShadowOpacity: number;

    /** If this value is true, the first and the last pages will be marked as hard and will be shown in single page mode */
    showCover: boolean;
    /** Rendering density used for pages placed as standalone covers */
    coverDensity: CoverDensity;
    /** Disable content scrolling when touching a book on mobile devices */
    mobileScrollSupport: boolean;

    /** Set the forward event of clicking on child elements (buttons, links) */
    clickEventForward: boolean;

    /** Using mouse and touch events to page flipping */
    useMouseEvents: boolean;

    swipeDistance: number;

    /** if this value is true, fold the corners of the book when the mouse pointer is over them. */
    showPageCorners: boolean;

    /** if this value is true, flipping by clicking on the whole book will be locked. Only on corners */
    disableFlipByClick: boolean;
}

export class Settings {
    private readonly defaultSetting: FlipSetting = {
        startPage: 0,
        size: SizeType.FIXED,
        readingDirection: ReadingDirection.LTR,
        width: 0,
        height: 0,
        minWidth: 0,
        maxWidth: 0,
        minHeight: 0,
        maxHeight: 0,
        drawShadow: true,
        backgroundColor: '#ffffff',
        flippingTime: 1000,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        maxShadowOpacity: 1,
        showCover: false,
        coverDensity: CoverDensity.HARD,
        mobileScrollSupport: true,
        swipeDistance: 30,
        clickEventForward: true,
        useMouseEvents: true,
        showPageCorners: true,
        disableFlipByClick: false,
    };

    /**
     * Processing parameters received from the user. Substitution default values
     *
     * @param userSetting
     * @returns {FlipSetting} Сonfiguration object
     */
    public getSettings(userSetting: Partial<FlipSetting>): FlipSetting {
        const result: FlipSetting = {
            ...this.defaultSetting,
            ...userSetting,
        };

        if (result.size !== SizeType.STRETCH && result.size !== SizeType.FIXED)
            throw new Error('Invalid size type. Available only "fixed" and "stretch" value');

        if (
            result.readingDirection !== ReadingDirection.LTR &&
            result.readingDirection !== ReadingDirection.RTL
        ) {
            throw new Error('Invalid reading direction. Available only "ltr" and "rtl" values');
        }

        if (
            result.coverDensity !== CoverDensity.SOFT &&
            result.coverDensity !== CoverDensity.HARD
        ) {
            throw new Error('Invalid cover density. Available only "soft" and "hard" values');
        }

        if (result.width <= 0 || result.height <= 0) throw new Error('Invalid width or height');

        if (result.flippingTime <= 0) throw new Error('Invalid flipping time');

        if (result.backgroundColor.trim() === '') throw new Error('Invalid background color');

        if (result.size === SizeType.STRETCH) {
            if (result.minWidth <= 0) result.minWidth = 100;

            if (result.maxWidth < result.minWidth) result.maxWidth = 2000;

            if (result.minHeight <= 0) result.minHeight = 100;

            if (result.maxHeight < result.minHeight) result.maxHeight = 2000;
        } else {
            result.minWidth = result.width;
            result.maxWidth = result.width;
            result.minHeight = result.height;
            result.maxHeight = result.height;
        }

        return result;
    }
}
