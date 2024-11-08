import { ServiceType } from "./types";

export abstract class Service {
    private static instance: Service | null = null;
    static serviceType: ServiceType;

    public static getInstance<T extends Service>(): T {
        if (!Service.instance) {
            // Use this.prototype.constructor to instantiate the concrete class
            Service.instance = new (this as any)();
        }
        return Service.instance as T;
    }

}