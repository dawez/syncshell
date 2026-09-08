<script>
    import {getContext} from 'svelte';
    import Dialog from './Dialog.svelte';
    import {managementActions, performManagement} from '../client/management.mjs';
    let {action, api, session, onClose, onDone, devices = []} = $props();
    const locale = getContext('locale');
    const definition = $derived(managementActions[action.type]);
    const name = $derived(action.folder?.label || action.folder?.id || action.device?.name || action.device?.deviceID);
    const introducer = $derived(devices.find(device => device.deviceID === action.device?.introducedBy && device.introducer));
    let busy = $state(false), error = $state('');
    async function apply() {
        busy = true; error = '';
        try { await performManagement(action, session, api); onDone(); }
        catch (value) { error = value.message; }
        finally { busy = false; }
    }
</script>
<Dialog title={definition.title} status="warning" icon="fas fa-question-circle" {onClose} onCancel={() => { if (!busy) onClose(); }}>
    <p>{locale.t(definition.description).replace('{%label%}', name).replace('{%name%}', name)}</p>
    {#if definition.detail}<p>{locale.t(definition.detail)}</p>{/if}
    {#if introducer}<p>{locale.t('{%reintroducer%} might reintroduce this device.').replace('{%reintroducer%}', introducer.name || introducer.deviceID)}</p>{/if}
    {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
    {#snippet footer()}<button class="btn btn-warning" disabled={busy} onclick={apply}>{locale.t(definition.button)}</button><button class="btn btn-default" disabled={busy} onclick={onClose}>{locale.t('Cancel')}</button>{/snippet}
</Dialog>
