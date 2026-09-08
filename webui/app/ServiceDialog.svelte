<script>
    import {getContext, onMount, untrack} from 'svelte';
    import Dialog from './Dialog.svelte';
    let {kind, state: snapshot, session, onClose} = $props();
    const locale = getContext('locale');
    const started = untrack(() => snapshot.system.startTime);
    let phase = $state('confirm'), error = $state('');
    const title = $derived(error ? 'Error' : phase === 'confirm' ? 'Upgrade' : kind === 'shutdown' ? 'Shutdown Complete' : 'Restarting');
    onMount(() => { if (kind !== 'upgrade') apply(); });
    $effect(() => {
        if (phase !== 'confirm' && started && snapshot.online && snapshot.system.startTime !== started) onClose();
    });
    async function apply() {
        phase = 'working'; error = '';
        try {
            await session.systemAction(kind);
            phase = 'waiting';
            if (kind !== 'shutdown' && snapshot.config.gui.useTLS !== (location.protocol === 'https:')) {
                location.protocol = snapshot.config.gui.useTLS ? 'https:' : 'http:';
            }
        } catch (value) { error = value.message; }
    }
</script>
<Dialog {title} status={error ? 'danger' : phase === 'confirm' ? 'warning' : kind === 'shutdown' ? 'success' : 'info'} icon={kind === 'shutdown' && phase === 'waiting' ? 'fas fa-power-off' : 'fas fa-hourglass-half'} {onClose} onCancel={() => { if (phase === 'confirm' || error) onClose(); }}>
    {#if error}<p role="alert">{error}</p>
    {:else if phase === 'confirm'}<p>{locale.t('Are you sure you want to upgrade?')}</p><p><a href={'https://github.com/syncthing/syncthing/releases/tag/' + encodeURIComponent(snapshot.upgradeInfo?.latest || '')} target="_blank" rel="noreferrer">{locale.t('Release Notes')}</a></p>
    {:else if kind === 'shutdown'}<p role="status">{locale.t(phase === 'working' ? 'Please wait' : 'Syncthing has been shut down.')}</p>
    {:else}<p role="status">{locale.t('Syncthing is restarting.')} {locale.t('Please wait')}...</p>{/if}
    {#snippet footer()}
        {#if error}<button class="btn btn-default" onclick={onClose}>{locale.t('Close')}</button>
        {:else if phase === 'confirm'}<button class="btn btn-primary" onclick={apply}>{locale.t('Upgrade')}</button><button class="btn btn-default" onclick={onClose}>{locale.t('Close')}</button>{/if}
    {/snippet}
</Dialog>
