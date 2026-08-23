import { Point } from '../BasicTypes';

/** Geometry needed to wrap a page mesh around the active crease. */
export interface ReflectionCurlFold {
    /** 0 at the free edge, 50 at the spine and 100 after a complete turn. */
    progress: number;
    /** Midpoint of the perpendicular bisector between the grab and pointer. */
    creaseMid: Point;
    /** Unit vector running along the crease. */
    creaseDirection: Point;
}

const REST_EPSILON = 2;

const limitPointToCircle = (center: Point, radius: number, point: Point): Point => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0 || distance <= radius) return point;

    return {
        x: center.x + (dx / distance) * radius,
        y: center.y + (dy / distance) * radius,
    };
};

/**
 * Keeps both spine corners on the stationary side of the fold. The valid drag
 * area is the intersection of the two circles centred on those corners.
 */
export const clampCurlTarget = (anchor: Point, target: Point, pageHeight: number): Point => {
    const top = { x: 0, y: 0 };
    const bottom = { x: 0, y: pageHeight };
    const topRadius = Math.hypot(anchor.x, anchor.y);
    const bottomRadius = Math.hypot(anchor.x, anchor.y - pageHeight);
    let result = target;

    for (let index = 0; index < 3; index += 1) {
        result = limitPointToCircle(top, topRadius, result);
        result = limitPointToCircle(bottom, bottomRadius, result);
    }

    return result;
};

/**
 * Computes a pointer-driven reflection fold. The free edge is at x=pageWidth,
 * the spine at x=0, and a completed turn lands at x=-pageWidth.
 */
export const calculateReflectionCurl = (
    anchor: Point,
    rawTarget: Point,
    pageWidth: number,
    pageHeight: number,
): ReflectionCurlFold | null => {
    const target = clampCurlTarget(anchor, rawTarget, pageHeight);
    const dx = target.x - anchor.x;
    const dy = target.y - anchor.y;
    const distance = Math.hypot(dx, dy);

    if (distance < REST_EPSILON) return null;

    const normal = { x: dx / distance, y: dy / distance };
    const creaseMid = {
        x: (anchor.x + target.x) / 2,
        y: (anchor.y + target.y) / 2,
    };
    const progress = Math.max(
        0,
        Math.min(100, (Math.abs(anchor.x - target.x) / (2 * pageWidth)) * 100),
    );

    return {
        progress,
        creaseMid,
        creaseDirection: { x: -normal.y, y: normal.x },
    };
};

/** Gentle landing used after releasing a drag or starting a scripted turn. */
export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);

/** Y coordinate of a scripted corner turn, arcing through the page centre. */
export const getProgrammaticTargetY = (
    anchorY: number,
    easedProgress: number,
    pageHeight: number,
): number => {
    if (anchorY > 0 && anchorY < pageHeight) return anchorY;

    const lift = Math.sin(Math.max(0, Math.min(1, easedProgress)) * Math.PI) * pageHeight * 0.5;
    return anchorY <= 0 ? lift : pageHeight - lift;
};
