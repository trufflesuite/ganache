import "emittery";

interface Events {
  // Blocked by https://github.com/microsoft/TypeScript/issues/1863, should be
  // `[eventName: EventName]: unknown;`
}

/**
Maps event names to their emitted data type.
*/
interface Events {
  [eventName: any]: (args: Events) => Promise<any>;
}

declare module "emittery" {
  export class Typed<EventDataMap extends Events, EmptyEvents extends EventName = never> extends Emittery.Typed {
    on<Name extends EventNameFromDataMap<EventDataMap>>(
      eventName: Name,
      listener: (eventData: Parameters<EventDataMap[Name]>[0]) => void
    ): Emittery.UnsubscribeFn;
    on<Name extends EmptyEvents>(eventName: Name, listener: () => void): Emittery.UnsubscribeFn;

    events<Name extends EventNameFromDataMap<EventDataMap>>(
      eventName: Name
    ): AsyncIterableIterator<Parameters<EventDataMap[Name]>[0]>;

    once<Name extends EventNameFromDataMap<EventDataMap>>(eventName: Name): Promise<ReturnType<EventDataMap[Name]>>;
    once<Name extends EmptyEvents>(eventName: Name): Promise<ReturnType<EventDataMap[Name]>>;

    off<Name extends EventNameFromDataMap<EventDataMap>>(
      eventName: Name,
      listener: (eventData: Parameters<EventDataMap[Name]>[0]) => void
    ): void;
    off<Name extends EmptyEvents>(eventName: Name, listener: () => void): void;

    onAny(
      listener: (
        eventName: EventNameFromDataMap<EventDataMap> | EmptyEvents,
        eventData?: EventDataMap[EventNameFromDataMap<EventDataMap>]
      ) => void
    ): Emittery.UnsubscribeFn;
    anyEvent(): AsyncIterableIterator<
      [EventNameFromDataMap<EventDataMap>, EventDataMap[EventNameFromDataMap<EventDataMap>]]
    >;

    offAny(
      listener: (
        eventName: EventNameFromDataMap<EventDataMap> | EmptyEvents,
        eventData?: EventDataMap[EventNameFromDataMap<EventDataMap>]
      ) => void
    ): void;

    emit<Name extends EventNameFromDataMap<EventDataMap>>(
      eventName: Name,
      eventData: Parameters<EventDataMap[Name]>[0]
    ): Promise<ReturnType<EventDataMap[Name]>>;
    emit<Name extends EmptyEvents>(eventName: Name): Promise<ReturnType<EventDataMap[Name]>>;

    emitSerial<Name extends EventNameFromDataMap<EventDataMap>>(
      eventName: Name,
      eventData: Parameters<EventDataMap[Name]>[0]
    ): Promise<ReturnType<EventDataMap[Name]>>;
    emitSerial<Name extends EmptyEvents>(eventName: Name): Promise<ReturnType<EventDataMap[Name]>>;
  }
}

export = Emittery;
