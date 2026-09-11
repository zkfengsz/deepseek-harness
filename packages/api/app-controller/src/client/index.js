/** React-free Client WorkBro application service over the `app` Remote namespace. */
import { Service } from '@deepseek-ai/cordis';
/** Required Client Remote services. */
export const inject = ['remote', 'remote.app'];
/** Owns the bare app snapshot and app commands, refreshing after each mutation. */
export class AppsService extends Service {
    snapshot = { apps: [] };
    listeners = new Set();
    list = {
        getSnapshot: () => this.snapshot,
        subscribe: (listener) => {
            this.listeners.add(listener);
            return () => { this.listeners.delete(listener); };
        },
    };
    constructor(ctx) {
        super(ctx, 'apps');
        void this.refresh();
    }
    refresh() {
        return this.ctx.remote.app.list().then((value) => {
            this.snapshot = { apps: value.apps };
            for (const listener of this.listeners)
                listener();
        });
    }
    async create(input) {
        const value = await this.ctx.remote.app.create(input);
        await this.refresh();
        return value.app;
    }
    async rename(appId, name) {
        const value = await this.ctx.remote.app.rename({ appId, name });
        await this.refresh();
        return value.app;
    }
    async bindWorkspace(appId, workspaceId) {
        const value = await this.ctx.remote.app.bindWorkspace({ appId, workspaceId });
        await this.refresh();
        return value.app;
    }
    async delete(appId) {
        await this.ctx.remote.app.delete({ appId });
        await this.refresh();
    }
}
/** Install Client WorkBro application state and commands. */
export function apply(ctx) {
    new AppsService(ctx);
}
//# sourceMappingURL=index.js.map