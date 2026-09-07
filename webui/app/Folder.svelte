<script>
    import {folderStatus, folderClass, folderStateClass, folderStateDetails}
        from '../client/folders.mjs';
    import {compactNumber, unitPrefixed} from '../client/format.mjs';
    import {stripeSections} from '../client/stripes.mjs';
    import Tooltip from './Tooltip.svelte';
    import Counts from './Counts.svelte';
    function stripes(node) { return {destroy: stripeSections(node)}; }

    let {folder, info, stats, rescan} = $props();
    let open = $state(false);
    let scanning = $state(false);
    const status = $derived(folderStatus(folder, info));
    const label = $derived(({idle: 'Up to Date', scanning: 'Scanning', syncing: 'Syncing',
        outofsync: 'Out of Sync', stopped: 'Stopped', paused: 'Paused',
        faileditems: 'Failed Items', unknown: 'Unknown', unshared: 'Unshared'})[status] || status);
    const color = $derived(folderStateClass(status));
    const details = $derived(folderStateDetails(folder, info));
    const summaries = $derived(details ? ['global', 'local'] : []);
    async function scan() {
        scanning = true;
        try { await rescan(); } catch {} finally { scanning = false; }
    }
</script>

<div class="panel panel-default">
    <button class="btn panel-heading" aria-expanded={open} onclick={() => { open = !open; }}>
        <span class="panel-title">
            <span class="panel-icon"><span class="fas fa-fw fa-folder" aria-hidden="true"></span></span>
            <span class="panel-status pull-right text-{folderClass(status)}">{label}</span>
            <span class="panel-title-text" title={folder.label || folder.id}>{folder.label || folder.id}</span>
        </span>
    </button>
    {#if open}
        <div class="panel-collapse" use:stripes><div class="panel-body less-padding">
            <details class="folder-details" open>
                <summary>Current activity</summary>
                <table class="table table-condensed table-auto"><tbody>
                    {#if !folder.paused && info?.state}
                        <tr class="folder-state-summary">
                            <th><Tooltip icon="fa fa-fw fa-circle text-{color}" label="Global/local State"
                                text="{label}. Shows the global totals alongside the folder status. Separate rows show global and local contents when details are needed; ignore patterns can make the totals differ even when up to date." />&nbsp;Global/local State</th>
                            <td class="text-right"><Counts {info} /></td>
                        </tr>
                        {#each summaries as prefix}
                            <tr class="folder-state-detail">
                                <th><Tooltip icon="fas fa-fw fa-{prefix === 'global' ? 'globe' : 'home'}"
                                    label={prefix === 'global' ? 'Global State' : 'Local State'}
                                    text={prefix === 'global'
                                        ? 'The latest known versions of files across the sharing devices. These totals describe the contents this folder would have when fully synchronized, before local ignore rules.'
                                        : 'The files and data Syncthing currently tracks in this folder on this device. These totals can differ from the global contents during synchronization or because of ignore patterns.'} />&nbsp;
                                    {prefix === 'global' ? 'Global State' : 'Local State'}</th>
                                <td class="text-right"><Counts {info} {prefix} /></td>
                            </tr>
                        {/each}
                    {/if}
                    {#if info?.needTotalItems > 0}
                        <tr><th>Out of Sync Items</th><td class="text-right">{compactNumber(info.needTotalItems)}</td></tr>
                    {/if}
                    {#if stats?.lastScan}
                        <tr><th><Tooltip icon="far fa-fw fa-clock" label="Last Scan"
                            text="When Syncthing last scanned this folder for local changes. This is a scan timestamp, not the time of the last file transfer." />&nbsp;Last Scan</th>
                            <td class="text-right">{new Date(stats.lastScan).toLocaleString()}</td></tr>
                    {/if}
                </tbody></table>
            </details>
            <details class="folder-details">
                <summary>Configuration</summary>
                <table class="table table-condensed table-auto"><tbody>
                    <tr><th>Rescans</th><td class="text-right">{folder.rescanIntervalS}s</td></tr>
                </tbody></table>
            </details>
            <details class="folder-details">
                <summary>Folder information</summary>
                <table class="table table-condensed table-auto"><tbody>
                    <tr><th>Folder Path</th><td class="text-right" title={folder.path}>{folder.path}</td></tr>
                    <tr><th>Folder Type</th><td class="text-right">{folder.type}</td></tr>
                    <tr><th>Folder ID</th><td class="text-right">{folder.id}</td></tr>
                </tbody></table>
            </details>
            <div class="pull-right">
                <button class="btn btn-sm btn-default" disabled={scanning || folder.paused} onclick={scan}>
                    <span class="fas fa-fw fa-sync" aria-hidden="true"></span> Rescan
                </button>
            </div>
        </div></div>
    {/if}
</div>
