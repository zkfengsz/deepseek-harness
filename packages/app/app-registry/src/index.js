/**
 * WorkBro application registry (`ctx.appRegistry`): durable first-class app
 * records (name, icon, description, preset, optional workspace binding) over
 * the domain data form.
 */
import { randomUUID } from 'node:crypto';
import { Service } from '@deepseek-ai/cordis';
import { appDomainSpec } from "./spec.js";
export { appDomainSpec, appDomainState, appRecord } from "./spec.js";
/** Brand a string as an {@link AppId}. */
export function AppId(id) {
    return id;
}
/** Project one durable record into its consumer-facing app. */
function appOf(id, record) {
    return { id, ...record };
}
/** Build a durable record from create input, dropping absent optional fields. */
function recordOf(input) {
    return {
        name: input.name,
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.preset !== undefined ? { preset: input.preset } : {}),
        ...(input.workspaceId !== undefined ? { workspaceId: input.workspaceId } : {}),
    };
}
const sameIds = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);
/** Durable WorkBro application registry over the domain data form. */
export class AppRegistry extends Service {
    static inject = ['storageDomain'];
    table;
    global;
    state;
    apps = new Map();
    operationTail = Promise.resolve();
    constructor(ctx) {
        super(ctx, 'appRegistry');
    }
    /** Open the domain, initialize on first use, and rebuild the ordered cache. */
    async [Service.init]() {
        const domain = await this.ctx.storageDomain.open(appDomainSpec);
        this.ctx.effect(() => () => domain.close(), 'app-registry.domainClose');
        this.table = domain.table('apps');
        this.global = domain.global;
        this.state = domain.global.get();
        if (!this.state.initialized) {
            await this.setState({ initialized: true, appIds: [] });
        }
        this.rebuild();
    }
    requireState() {
        if (this.state === undefined)
            throw new Error('app registry not initialized');
        return this.state;
    }
    requireTable() {
        if (this.table === undefined)
            throw new Error('app registry table unavailable');
        return this.table;
    }
    requireGlobal() {
        if (this.global === undefined)
            throw new Error('app registry global unavailable');
        return this.global;
    }
    async setState(state) {
        await this.requireGlobal().set(state);
        this.state = state;
    }
    rebuild() {
        this.apps.clear();
        for (const id of this.requireState().appIds) {
            const record = this.requireTable().get(id);
            if (record === undefined)
                throw new Error(`app registry order references missing app '${id}'`);
            this.apps.set(id, appOf(id, record));
        }
    }
    enqueue(operation) {
        const result = this.operationTail.then(operation, operation);
        this.operationTail = result.then(() => undefined, () => undefined);
        return result;
    }
    /** Ordered app projection in durable registry order. */
    list() {
        return this.requireState().appIds.map((id) => {
            const app = this.apps.get(id);
            if (app === undefined)
                throw new Error(`app registry order references missing app '${id}'`);
            return app;
        });
    }
    /** Look up one app by id. */
    get(id) {
        return this.apps.get(id);
    }
    /** Create one app and prepend it to the durable order. */
    create(input) {
        return this.enqueue(async () => {
            const id = AppId(randomUUID());
            const record = recordOf(input);
            await this.requireTable().put(id, record);
            await this.setState({ ...this.requireState(), appIds: [id, ...this.requireState().appIds] });
            const app = appOf(id, record);
            this.apps.set(id, app);
            return app;
        });
    }
    /** Rename one app durably. */
    rename(id, name) {
        return this.enqueue(async () => {
            const record = this.requireTable().get(id);
            if (record === undefined)
                throw new Error(`unknown app '${id}'`);
            const next = { ...record, name };
            await this.requireTable().put(id, next);
            const app = appOf(id, next);
            this.apps.set(id, app);
            return app;
        });
    }
    /** Bind or unbind a workspace as the app's data context. */
    bindWorkspace(id, workspaceId) {
        return this.enqueue(async () => {
            const record = this.requireTable().get(id);
            if (record === undefined)
                throw new Error(`unknown app '${id}'`);
            const next = workspaceId === undefined
                ? { ...record, workspaceId: undefined }
                : { ...record, workspaceId };
            await this.requireTable().put(id, next);
            const app = appOf(id, next);
            this.apps.set(id, app);
            return app;
        });
    }
    /** Delete one app registration. Unknown ids are an idempotent no-op. */
    delete(id) {
        return this.enqueue(async () => {
            const state = this.requireState();
            if (!state.appIds.includes(id))
                return false;
            await this.requireTable().delete(id);
            await this.setState({ ...state, appIds: state.appIds.filter(appId => appId !== id) });
            this.apps.delete(id);
            return true;
        });
    }
    /** Move one app within the durable display order, DOM-insertBefore-like. */
    insertBefore(id, beforeId) {
        return this.enqueue(async () => {
            const state = this.requireState();
            if (!state.appIds.includes(id))
                throw new Error(`unknown app '${id}'`);
            if (beforeId !== undefined && !state.appIds.includes(beforeId)) {
                throw new Error(`unknown app '${beforeId}'`);
            }
            if (beforeId === id)
                return state.appIds;
            const without = state.appIds.filter(appId => appId !== id);
            const at = beforeId === undefined ? without.length : without.indexOf(beforeId);
            const appIds = [...without.slice(0, at), id, ...without.slice(at)];
            if (sameIds(appIds, state.appIds))
                return state.appIds;
            await this.setState({ ...state, appIds });
            return appIds;
        });
    }
}
export default AppRegistry;
//# sourceMappingURL=index.js.map