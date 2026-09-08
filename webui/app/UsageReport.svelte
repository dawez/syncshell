<script>
    import {getContext, untrack} from 'svelte';
    import Dialog from './Dialog.svelte';
    import {usageReport, decideUsage} from '../client/reports.mjs';
    let {api, session, state: snapshot, consent = false, onClose} = $props();
    const locale = getContext('locale');
    const maximum = untrack(() => snapshot.system.urVersionMax || 2);
    let version = $state(maximum), diff = $state(false), preview = $state(!untrack(() => consent));
    let report = $state(null), error = $state(''), busy = $state(false);
    $effect(() => {
        if (!preview) return;
        const controller = new AbortController(); report = null;
        usageReport(api, version, diff, controller.signal).then(value => { report = value; error = ''; })
            .catch(value => { if (!controller.signal.aborted) error = value.message; });
        return () => controller.abort();
    });
    async function decide(accepted) {
        busy = true;
        try { await decideUsage(session, maximum, accepted); onClose(); }
        catch (value) { error = value.message; }
        finally { busy = false; }
    }
</script>
<Dialog title={consent ? 'Allow Anonymous Usage Reporting?' : 'Anonymous Usage Reporting'} large status="info" icon="fas fa-chart-bar" {onClose} onCancel={() => { if (!consent && !busy) onClose(); }}>
    {#if consent && snapshot.config.options.urAccepted > 0}<p>{locale.t('Anonymous usage report format has changed. Would you like to move to the new format?')}</p>
    {:else}<p>{locale.t('The encrypted usage report is sent daily. It is used to track common platforms, folder sizes, and app versions. If the reported data set is changed you will be prompted with this dialog again.')}</p><p>{locale.t('The aggregated statistics are publicly available at the URL below.')} <a href="https://data.syncthing.net/" target="_blank" rel="noreferrer">data.syncthing.net</a></p>{/if}
    {#if !preview}<button class="btn btn-default" onclick={() => { preview = true; }}>{locale.t('Preview Usage Report')}</button>
    {:else}
        {#if !consent}<label for="report-version">{locale.t('Version')}</label><select id="report-version" class="form-control" bind:value={version}>{#each Array.from({length: maximum - 1}, (_, i) => maximum - i) as value}<option {value}>{locale.t('Version')} {value}</option>{/each}</select>
            {#if version > 2}<label><input type="checkbox" bind:checked={diff}> {locale.t('Show diff with previous version')}</label>{/if}
        {/if}
        {#if report}<pre class="port-share-text">{JSON.stringify(report, null, 2)}</pre>{:else if !error}<p role="status">{locale.t('Loading data...')}</p>{/if}
    {/if}
    {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
    {#snippet footer()}{#if consent}<button class="btn btn-success" disabled={busy} onclick={() => decide(true)}>{locale.t('Yes')}</button><button class="btn btn-danger" disabled={busy} onclick={() => decide(false)}>{locale.t('No')}</button>{:else}<button class="btn btn-default" onclick={onClose}>{locale.t('Close')}</button>{/if}{/snippet}
</Dialog>
