import { describe, expect, it } from 'bun:test';

import {
    calculateCurlAnchorY,
    calculatePointerAlignedCreaseDistance,
    calculateReflectionCurl,
    clampCurlTarget,
    getProgrammaticTargetY,
} from '../src/Flip/ReflectionCurl';

const width = 400;
const height = 600;

describe('rounded curl geometry', () => {
    it('does not create a fold before the pointer leaves the free edge', () => {
        expect(
            calculateReflectionCurl(
                { x: width, y: height / 2 },
                { x: width, y: height / 2 },
                width,
                height,
            ),
        ).toBeNull();
    });

    it('maps the spine and opposite edge to half and complete progress', () => {
        const anchor = { x: width, y: height / 2 };
        const halfway = calculateReflectionCurl(anchor, { x: 0, y: anchor.y }, width, height);
        const complete = calculateReflectionCurl(anchor, { x: -width, y: anchor.y }, width, height);

        expect(halfway?.progress).toBeCloseTo(50, 6);
        expect(complete?.progress).toBeCloseTo(100, 6);
    });

    it('produces a vertical crease for a horizontal middle-edge drag', () => {
        const fold = calculateReflectionCurl(
            { x: width, y: height / 2 },
            { x: width * 0.4, y: height / 2 },
            width,
            height,
        );

        expect(Math.abs(fold?.creaseDirection.x ?? 1)).toBeLessThan(1e-8);
        expect(fold?.creaseDirection.y).toBeCloseTo(-1, 8);
    });

    it('keeps an extreme drag within reach of both spine corners', () => {
        const anchor = { x: width, y: 0 };
        const target = clampCurlTarget(anchor, { x: -3000, y: -3000 }, height);

        expect(Math.hypot(target.x, target.y)).toBeLessThanOrEqual(width + 0.5);
        expect(Math.hypot(target.x, target.y - height)).toBeLessThanOrEqual(
            Math.hypot(width, height) + 0.5,
        );
    });

    it('arcs scripted top and bottom turns through the page centre', () => {
        expect(getProgrammaticTargetY(0, 0.5, height)).toBeCloseTo(height / 2, 8);
        expect(getProgrammaticTargetY(height, 0.5, height)).toBeCloseTo(height / 2, 8);
        expect(getProgrammaticTargetY(0, 0, height)).toBe(0);
        expect(getProgrammaticTargetY(height, 1, height)).toBeCloseTo(height, 8);
    });

    it('offsets the cylinder crease so the grabbed edge reaches the pointer', () => {
        for (const radius of [20, 80, 160]) {
            for (const dragDistance of [5, 50, 200, 500]) {
                const creaseDistance = calculatePointerAlignedCreaseDistance(dragDistance, radius);
                const angle = creaseDistance / radius;
                const renderedDisplacement =
                    angle <= Math.PI
                        ? creaseDistance - radius * Math.sin(angle)
                        : 2 * creaseDistance - Math.PI * radius;

                expect(renderedDisplacement).toBeCloseTo(dragDistance, 4);
            }
        }
    });

    it('keeps top and bottom corner folds as vertical mirror images', () => {
        const top = calculateReflectionCurl(
            { x: width, y: 0 },
            { x: width - 80, y: 60 },
            width,
            height,
        );
        const bottom = calculateReflectionCurl(
            { x: width, y: height },
            { x: width - 80, y: height - 60 },
            width,
            height,
        );

        expect(top?.dragDistance).toBeCloseTo(bottom?.dragDistance ?? 0, 8);
        expect((top?.creaseMid.y ?? 0) + (bottom?.creaseMid.y ?? 0)).toBeCloseTo(height, 8);
        expect(top?.creaseDirection.x).toBeCloseTo(-(bottom?.creaseDirection.x ?? 0), 8);
        expect(top?.creaseDirection.y).toBeCloseTo(bottom?.creaseDirection.y ?? 0, 8);
    });

    it('biases spine-side starts toward the matching corner without changing the centre or free edge', () => {
        const upperStart = { x: 0, y: height * 0.15 };
        const lowerStart = { x: 0, y: height * 0.85 };
        const upperAnchor = calculateCurlAnchorY(upperStart, width, height);
        const lowerAnchor = calculateCurlAnchorY(lowerStart, width, height);

        expect(upperAnchor).toBeLessThan(upperStart.y);
        expect(lowerAnchor).toBeGreaterThan(lowerStart.y);
        expect(upperAnchor + lowerAnchor).toBeCloseTo(height, 8);
        expect(calculateCurlAnchorY({ x: 0, y: height / 2 }, width, height)).toBe(height / 2);
        expect(calculateCurlAnchorY({ x: 0, y: height * 0.4 }, width, height)).toBe(0);
        expect(calculateCurlAnchorY({ x: 0, y: height * 0.6 }, width, height)).toBe(height);
        expect(calculateCurlAnchorY({ x: width / 2, y: height * 0.4 }, width, height)).toBe(
            height * 0.4,
        );
        expect(calculateCurlAnchorY({ x: width, y: height * 0.15 }, width, height)).toBe(
            height * 0.15,
        );
    });
});
