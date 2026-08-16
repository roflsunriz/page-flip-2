import { CanvasRender } from '../Render/CanvasRender';
import { Page, PageDensity, PageOrientation } from './Page';
import { Render } from '../Render/Render';
import { Point } from '../BasicTypes';

const ImageLoadState = {
    IDLE: 'idle',
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error',
} as const;

type ImageLoadState = (typeof ImageLoadState)[keyof typeof ImageLoadState];

/**
 * Class representing a book page as an image on Canvas
 */
export class ImagePage extends Page {
    private readonly image: HTMLImageElement = null;
    private readonly href: string;
    private loadState: ImageLoadState = ImageLoadState.IDLE;

    private loadingAngle = 0;

    constructor(render: Render, href: string, density: PageDensity) {
        super(render, density);

        this.image = new Image();
        this.href = href;
    }

    public draw(): void {
        const ctx = (this.render as CanvasRender).getContext();

        const pagePos = this.render.convertToGlobal(this.state.position);
        const pageWidth = this.render.getRect().pageWidth;
        const pageHeight = this.render.getRect().height;

        ctx.save();
        ctx.translate(pagePos.x, pagePos.y);
        ctx.beginPath();

        for (let p of this.state.area) {
            if (p !== null) {
                p = this.render.convertToGlobal(p);
                ctx.lineTo(p.x - pagePos.x, p.y - pagePos.y);
            }
        }

        ctx.rotate(this.state.angle);

        ctx.clip();

        if (this.loadState === ImageLoadState.LOADING) {
            this.drawLoader(ctx, { x: 0, y: 0 }, pageWidth, pageHeight);
        } else if (this.loadState === ImageLoadState.LOADED) {
            ctx.drawImage(this.image, 0, 0, pageWidth, pageHeight);
        } else {
            this.drawError(ctx, { x: 0, y: 0 }, pageWidth, pageHeight);
        }

        ctx.restore();
    }

    public simpleDraw(orient: PageOrientation): void {
        const rect = this.render.getRect();
        const ctx = (this.render as CanvasRender).getContext();

        const pageWidth = rect.pageWidth;
        const pageHeight = rect.height;

        const x = orient === PageOrientation.RIGHT ? rect.left + rect.pageWidth : rect.left;

        const y = rect.top;

        if (this.loadState === ImageLoadState.LOADING) {
            this.drawLoader(ctx, { x, y }, pageWidth, pageHeight);
        } else if (this.loadState === ImageLoadState.LOADED) {
            ctx.drawImage(this.image, x, y, pageWidth, pageHeight);
        } else {
            this.drawError(ctx, { x, y }, pageWidth, pageHeight);
        }
    }

    private drawLoader(
        ctx: CanvasRenderingContext2D,
        shiftPos: Point,
        pageWidth: number,
        pageHeight: number,
    ): void {
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(200, 200, 200)';
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.lineWidth = 1;
        ctx.rect(shiftPos.x + 1, shiftPos.y + 1, pageWidth - 1, pageHeight - 1);
        ctx.stroke();
        ctx.fill();

        const middlePoint: Point = {
            x: shiftPos.x + pageWidth / 2,
            y: shiftPos.y + pageHeight / 2,
        };

        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.arc(
            middlePoint.x,
            middlePoint.y,
            20,
            this.loadingAngle,
            (3 * Math.PI) / 2 + this.loadingAngle,
        );
        ctx.stroke();
        ctx.closePath();

        this.loadingAngle += 0.07;
        if (this.loadingAngle >= 2 * Math.PI) {
            this.loadingAngle = 0;
        }

        this.render.requestRender();
    }

    public load(): void {
        if (this.loadState !== ImageLoadState.IDLE) return;

        this.loadState = ImageLoadState.LOADING;
        this.image.onload = (): void => {
            this.loadState = ImageLoadState.LOADED;
            this.render.requestRender();
        };
        this.image.onerror = (): void => {
            this.loadState = ImageLoadState.ERROR;
            this.render.requestRender();
        };
        this.image.src = this.href;

        if (this.loadState === ImageLoadState.LOADING && this.image.complete) {
            this.loadState =
                this.image.naturalWidth > 0 ? ImageLoadState.LOADED : ImageLoadState.ERROR;
            this.render.requestRender();
        }
    }

    public destroy(): void {
        this.image.onload = null;
        this.image.onerror = null;
        this.image.removeAttribute('src');
        this.loadState = ImageLoadState.IDLE;
    }

    public newTemporaryCopy(): Page {
        return this;
    }

    public getTemporaryCopy(): Page {
        return this;
    }

    public hideTemporaryCopy(): void {
        return;
    }

    private drawError(
        ctx: CanvasRenderingContext2D,
        shiftPos: Point,
        pageWidth: number,
        pageHeight: number,
    ): void {
        ctx.save();
        ctx.strokeStyle = 'rgb(180, 80, 80)';
        ctx.fillStyle = 'rgb(255, 245, 245)';
        ctx.lineWidth = 2;
        ctx.fillRect(shiftPos.x, shiftPos.y, pageWidth, pageHeight);
        ctx.strokeRect(shiftPos.x + 1, shiftPos.y + 1, pageWidth - 2, pageHeight - 2);

        const radius = Math.min(pageWidth, pageHeight) / 12;
        const centerX = shiftPos.x + pageWidth / 2;
        const centerY = shiftPos.y + pageHeight / 2;
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.moveTo(centerX + radius, centerY - radius);
        ctx.lineTo(centerX - radius, centerY + radius);
        ctx.stroke();
        ctx.restore();
    }
}
