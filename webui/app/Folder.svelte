<script>
    import {folderStatus, folderClass, folderStateClass, folderStateDetails}
        from '../client/folders.mjs';
    import {compactNumber, unitPrefixed} from '../client/format.mjs';

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
    const display = prefix => `${compactNumber(info?.[prefix + 'Files'])} · ${unitPrefixed(info?.[prefix + 'Bytes'], true)}B`;
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
        <div class="panel-collapse"><div class="panel-body less-padding">
            <details class="folder-details" open>
                <summary>Current activity</summary>
                <table class="table table-condensed table-auto"><tbody>
                    {#if !folder.paused && info?.state}
                        <tr class="folder-state-summary">
                            <th><span class="fas fa-fw fa-circle text-{color}" title={label}></span> Global/local State</th>
                            <td class="text-right">{display('global')}</td>
                        </tr>
                        {#each summaries as prefix}
                            <tr class="folder-state-detail">
                                <th><span class="fas fa-fw fa-{prefix === 'global' ? 'globe' : 'home'}"></span>
                                    {prefix === 'global' ? 'Global State' : 'Local State'}</th>
                                <td class="text-right">{display(prefix)}</td>
                            </tr>
                        {/each}
                    {/if}
                    {#if info?.needTotalItems > 0}
                        <tr><th>Out of Sync Items</th><td class="text-right">{compactNumber(info.needTotalItems)}</td></tr>
                    {/if}
                    {#if stats?.lastScan}
                        <tr><th><span class="fas fa-fw fa-clock"></span> Last Scan</th>
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
