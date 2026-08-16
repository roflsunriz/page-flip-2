import { UI } from './UI';
import { PageFlip } from '../PageFlip';
import { FlipSetting } from '../Settings';

/**
 * UI for HTML mode
 */
export class HTMLUI extends UI {
    private items: HTMLElement[];
    private itemStates = new Map<HTMLElement, { className: string; style: string | null }>();

    constructor(
        inBlock: HTMLElement,
        app: PageFlip,
        setting: FlipSetting,
        items: NodeListOf<HTMLElement> | HTMLElement[],
    ) {
        super(inBlock, app, setting);

        // Second wrapper to HTML page
        this.wrapper.insertAdjacentHTML('afterbegin', '<div class="page-flip-2__block"></div>');

        this.distElement = inBlock.querySelector('.page-flip-2__block');

        this.items = Array.from(items);
        this.captureItemStates(this.items);
        for (const item of this.items) {
            this.distElement.appendChild(item);
        }

        this.setHandlers();
    }

    public clear(): void {
        for (const item of this.items) {
            this.restoreItemState(item);
            this.parentElement.appendChild(item);
        }
    }

    public destroy(): void {
        this.clear();
        super.destroy();
    }

    /**
     * Update page list from HTMLElements
     *
     * @param {(NodeListOf<HTMLElement>|HTMLElement[])} items - List of pages as HTML Element
     */
    public updateItems(items: NodeListOf<HTMLElement> | HTMLElement[]): void {
        this.removeHandlers();

        for (const item of this.items) this.restoreItemState(item);
        this.distElement.replaceChildren();

        this.items = Array.from(items);
        this.captureItemStates(this.items);
        for (const item of this.items) {
            this.distElement.appendChild(item);
        }

        this.setHandlers();
    }

    public update(): void {
        this.app.getRender().update();
    }

    private captureItemStates(items: HTMLElement[]): void {
        this.itemStates = new Map(
            items.map((item) => [
                item,
                {
                    className: item.className,
                    style: item.getAttribute('style'),
                },
            ]),
        );
    }

    private restoreItemState(item: HTMLElement): void {
        const state = this.itemStates.get(item);
        if (state === undefined) return;

        item.className = state.className;
        if (state.style === null) item.removeAttribute('style');
        else item.setAttribute('style', state.style);
    }
}
