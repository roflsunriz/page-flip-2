import { PageFlip } from '../PageFlip';

/**
 * Data type passed to the event handler
 */
export type DataType = number | string | boolean | object | null;

/**
 * Type of object in event handlers
 */
export interface WidgetEvent<T extends DataType = DataType> {
    data: T;
    object: PageFlip;
}

export type EventCallback<T extends DataType = DataType> = (event: WidgetEvent<T>) => void;

/**
 * A class implementing a basic event model
 */
export abstract class EventObject {
    private events = new Map<string, EventCallback[]>();

    /**
     * Add new event handler
     *
     * @param {string} eventName
     * @param {EventCallback} callback
     */
    public on<T extends DataType = DataType>(eventName: string, callback: EventCallback<T>): this {
        const storedCallback = callback as EventCallback;

        if (!this.events.has(eventName)) {
            this.events.set(eventName, [storedCallback]);
        } else {
            this.events.get(eventName).push(storedCallback);
        }

        return this;
    }

    /**
     * Removing all handlers from an event
     *
     * @param {string} event - Event name
     */
    public off(event: string): void {
        this.events.delete(event);
    }

    protected trigger<T extends DataType = null>(
        eventName: string,
        app: PageFlip,
        data: T = null,
    ): void {
        if (!this.events.has(eventName)) return;

        for (const callback of this.events.get(eventName)) {
            callback({ data, object: app });
        }
    }
}
