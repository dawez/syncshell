<script>
    import {getContext} from 'svelte';
    import {folderStatus, folderClass, folderStateClass, folderStateDetails, syncPercentage, progressPercentage}
        from '../client/folders.mjs';
    import {folderStatusText, folderStatusIcon, folderTypes, pullOrders, scanRemaining}
        from '../client/folder-view.mjs';
    import {compactNumber, unitPrefixed, duration, timestamp} from '../client/format.mjs';
    import {stripeSections} from '../client/stripes.mjs';
    import {fieldHelp} from '../client/field-help.mjs';
    import Tooltip from './Tooltip.svelte';
    import Counts from './Counts.svelte';
    import Field from './Field.svelte';
    import Versioning from './Versioning.svelte';
    import ItemsDialog from './ItemsDialog.svelte';
    function stripes(node) { return {destroy: stripeSections(node)}; }
    const locale = getContext('locale');
    let {folder, info, stats, progress, api, rescan} = $props();
    let open = $state(false);
    let scanning = $state(false);
    let itemsKind = $state('');
    const status = $derived(folderStatus(folder, info));
    const label = $derived(folderStatusText(status));
    const color = $derived(folderStateClass(status));
    const summaries = $derived(folderStateDetails(folder, info) ? ['global', 'local'] : []);
    const percent = $derived(status === 'syncing' ? syncPercentage(info) : progress
        ? progressPercentage(progress.current, progress.total) : undefined);
    const watcherFailed = $derived(folder.fsWatcherEnabled && !folder.paused && status !== 'stopped' && info?.watchError);
    const localChanges = $derived(['receiveonly', 'receiveencrypted'].includes(folder.type) && info?.receiveOnlyTotalItems > 0);
    const basename = value => (value || '').split(/[\\/]/).at(-1);
    async function scan() {
        scanning = true;
        try { await rescan(); } catch {} finally { scanning = false; }
    }
</script>

<div class="panel panel-default">
    <button class="btn panel-heading" aria-expanded={open} onclick={() => { open = !open; }}>
        {#if ['scanning', 'syncing'].includes(status) && percent !== undefined}
            <span class="panel-progress" style:width="{percent}%"></span>
        {/if}
        <span class="panel-title">
            <span class="panel-icon hidden-xs"><span class="fas fa-fw fa-{({sendonly: 'upload', receiveonly: 'download', receiveencrypted: 'lock'})[folder.type] || 'folder'}" aria-hidden="true"></span></span>
            <span class="panel-status pull-right text-{folderClass(status)}">
                <span class="hidden-xs">{locale.t(label)}</span>
                {#if status === 'scanning' && percent !== undefined} ({percent}%){/if}
                {#if status === 'syncing'} ({percent}%, {unitPrefixed(info.needBytes, true)}B){/if}
                <span class="visible-xs fa fa-fw {folderStatusIcon(status)}" aria-label={locale.t(label)}></span>
            </span>
            <span class="panel-title-text" title={folder.label || folder.id}>{folder.label || folder.id}</span>
        </span>
    </button>
    {#if open}
        <div class="panel-collapse" use:stripes><div class="panel-body less-padding">
            <details class="folder-details" open>
                <summary>{locale.t('Current activity')}</summary>
                <table class="table table-condensed table-auto"><tbody>
                    {#if !folder.paused && info?.state}
                        <tr class="folder-state-summary">
                            <th><Tooltip icon="fa fa-fw fa-circle text-{color}" label="Global/local State"
                                prefix={label} text={fieldHelp['Global/local State'].help} />&nbsp;<span>{locale.t('Global/local State')}</span></th>
                            <td class="text-right"><Counts {info} /></td>
                        </tr>
                    {/if}
                    {#each summaries as prefix}
                        <Field label={prefix === 'global' ? 'Global State' : 'Local State'} rowClass="folder-state-detail">
                            <Counts {info} {prefix} />
                        </Field>
                    {/each}
                    {#if info?.needTotalItems > 0}
                        <Field label="Out of Sync Items"><a href="#needed" onclick={event => { event.preventDefault(); itemsKind = 'need'; }}>
                            {compactNumber(info.needTotalItems)} {locale.t('items')}, ~{unitPrefixed(info.needBytes, true)}B</a></Field>
                    {/if}
                    {#if !folder.paused && info?.state && folder.ignoreDelete}
                        <tr><td colspan="2" class="text-right"><i class="small">{locale.t('Altered by ignoring deletes.')} <a href="https://docs.syncthing.net/advanced/folder-ignoredelete.html" target="_blank" rel="noreferrer">{locale.t('Help')}</a></i></td></tr>
                    {/if}
                    {#if stats?.lastScan}
                        <Field label="Last Scan">{(Date.now() - new Date(stats.lastScan)) / 86400000 >= 365 ? locale.t('Never') : timestamp(stats.lastScan)}</Field>
                    {/if}
                    {#if !folder.paused && (info?.invalid || info?.error)}
                        <Field label="Error"><Tooltip label={info.invalid || info.error} text={info.invalid || info.error}
                            triggerText={info.invalid || info.error} /></Field>
                    {/if}
                    {#if info && info.errors !== 0}
                        <Field label="Failed Items"><a href="#failed" onclick={event => { event.preventDefault(); itemsKind = 'failed'; }}>
                            {compactNumber(info.pullErrors || 0)} {locale.t('items')}</a></Field>
                    {/if}
                    {#if localChanges}
                        <Field label="Locally Changed Items"><a href="#local-changed" onclick={event => { event.preventDefault(); itemsKind = 'local'; }}>
                            {compactNumber(info.receiveOnlyTotalItems)} {locale.t('items')}, ~{unitPrefixed(info.receiveOnlyChangedBytes, true)}B</a></Field>
                    {/if}
                    {#if status === 'scanning' && progress?.rate > 0}
                        <Field label="Scan Time Remaining"><span title={unitPrefixed(progress.rate, true) + 'B/s'}>~ {scanRemaining(progress)}</span></Field>
                    {/if}
                    {#if !['sendonly', 'receiveencrypted'].includes(folder.type) && stats?.lastFile?.filename}
                        <Field label="Latest Change">
                            <Tooltip label={stats.lastFile.filename} triggerText={basename(stats.lastFile.filename)} tail kind="change">
                                {folder.path}/{stats.lastFile.filename}<br>
                                <span class="text-nowrap"><span class:text-danger={stats.lastFile.deleted} class:text-success={!stats.lastFile.deleted}>{locale.t(stats.lastFile.deleted ? 'Deleted' : 'Updated')}</span>
                                    @ <span class="text-warning folder-change-time">{timestamp(stats.lastFile.at)}</span></span>
                            </Tooltip>
                        </Field>
                    {/if}
                </tbody></table>
            </details>
            <details class="folder-details">
                <summary>{locale.t('Configuration')}</summary>
                <table class="table table-condensed table-auto"><tbody>
                    <Field label="Rescans">
                        <span title={watcherFailed || ''}><span class="far fa-clock"></span>&nbsp;{folder.rescanIntervalS > 0 ? duration(folder.rescanIntervalS, 's', locale.language) : locale.t('Disabled')}&ensp;
                            <span class="fas fa-{folder.fsWatcherEnabled && !watcherFailed ? 'eye' : 'eye-slash'}"></span>&nbsp;{locale.t(watcherFailed ? 'Failed to set up, retrying' : folder.fsWatcherEnabled ? 'Enabled' : 'Disabled')}</span>
                    </Field>
                    {#if folder.versioning?.type}<Field label="File Versioning"><Versioning config={folder.versioning} /></Field>{/if}
                    {#if folder.ignorePerms}<Field label="Ignore Permissions">{locale.t('Yes')}</Field>{/if}
                </tbody></table>
            </details>
            <details class="folder-details">
                <summary>{locale.t('Folder information')}</summary>
                <table class="table table-condensed table-auto"><tbody>
                    <Field label="Folder Path"><Tooltip label={folder.path} text={folder.path} triggerText={folder.path} tail /></Field>
                    <Field label="Folder Type">{locale.t(folderTypes[folder.type] || '')}</Field>
                    {#if folder.label}<Field label="Folder ID"><Tooltip label={folder.id} text={folder.id} triggerText={folder.id} /></Field>{/if}
                    <Field label="Block Indexing">{locale.t(folder.blockIndexing ? 'Yes' : 'No')}</Field>
                    {#if folder.type !== 'sendonly'}<Field label="File Pull Order">{locale.t(pullOrders[folder.order] || '')}</Field>{/if}
                </tbody></table>
            </details>
        </div>
            <div class="panel-footer folder-actions">
                <button class="btn btn-sm btn-default" disabled={scanning || !['idle', 'stopped', 'unshared', 'outofsync', 'faileditems', 'localadditions'].includes(status)} onclick={scan}>
                    <span class="fas fa-fw fa-refresh" aria-hidden="true"></span> {locale.t('Rescan')}
                </button>
            </div>
        </div>
    {/if}
</div>
{#if itemsKind}
    <ItemsDialog {api} {folder} kind={itemsKind} total={itemsKind === 'need' ? info.needTotalItems : itemsKind === 'failed' ? info.pullErrors : info.receiveOnlyTotalItems} onClose={() => { itemsKind = ''; }} />
{/if}
