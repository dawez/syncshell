<script>
    import {getContext} from 'svelte';
    import Dialog from './Dialog.svelte';
    import Editor from './Editor.svelte';
    import RemoteFiles from './RemoteFiles.svelte';
    import RestoreVersions from './RestoreVersions.svelte';
    import {deviceName, sharedFolders, serviceHealth} from '../client/devices.mjs';
    import {timestamp} from '../client/format.mjs';
    let {action, state: snapshot, api, session, onClose} = $props();
    const locale = getContext('locale');
    const health = $derived(serviceHealth(action.type === 'listeners' ? snapshot.system.connectionServiceStatus : snapshot.system.discoveryStatus));
    const folders = $derived(action.device ? sharedFolders(snapshot.config, action.device.deviceID).filter(folder => {
        const completion = snapshot.completion[action.device.deviceID]?.[folder.id];
        return !completion || completion.needItems + completion.needDeletes > 0;
    }) : []);
    const friendly = id => deviceName(snapshot.config.devices.find(device => device.deviceID.startsWith(id || '\0'))) || id || locale.t('Unknown');
    let copied = $state(false);
    async function copyID() { await navigator.clipboard.writeText(action.device.deviceID); copied = true; }
</script>

{#if action.type.startsWith('edit-') || action.type.startsWith('add-') || action.type === 'settings'}
    <Editor {action} state={snapshot} {api} {session} {onClose} />
{:else if action.type === 'versions'}
    <RestoreVersions {api} folder={action.folder} {onClose} />
{:else if action.type === 'about'}
    <Dialog title="About" icon="fas fa-info-circle" {onClose}>
        <h3>Syncshell Modern / Omarchy UI</h3>
        <p>Based on Syncthing, by the Syncthing authors and community.</p>
        <p>Syncthing {snapshot.version.version}</p>
        <p><a href="https://github.com/omarchy-QOL/syncshell" target="_blank" rel="noreferrer">Syncshell</a> · <a href="https://syncthing.net" target="_blank" rel="noreferrer">Syncthing</a> · <a href="LICENSE.syncthing" target="_blank">Mozilla Public License 2.0</a></p>
    </Dialog>
{:else if action.type === 'identification'}
    <Dialog title={locale.t('Device Identification') + ' - ' + deviceName(action.device)} large status="info" icon="fas fa-qrcode" {onClose}>
        <div class="text-center"><div class="well well-sm text-monospace"><strong>{action.device.deviceID}</strong></div>
            <img class="img-thumbnail" src={'qr/?text=' + encodeURIComponent(action.device.deviceID)} height="328" width="328" alt={locale.t('QR code')}>
            <div class="btn-group-vertical"><button class="btn btn-default" onclick={copyID}><span class="fa fa-clone"></span> {locale.t(copied ? 'Copied!' : 'Copy')}</button></div>
        </div>
    </Dialog>
{:else if action.type === 'listeners' || action.type === 'discovery'}
    <Dialog title={action.type === 'listeners' ? health.failed.length ? 'Listener Failures' : 'Listener Status' : health.failed.length ? 'Discovery Failures' : 'Discovery Status'} status={health.failed.length ? 'danger' : 'default'} icon="fas fa-sitemap" {onClose}>
        {#each health.entries as [name, value]}<h5>{name}</h5><dl>
            {#each Object.entries(value || {}) as [key, item]}<dt>{key}</dt><dd class:text-danger={key === 'error'}>{Array.isArray(item) ? item.join(', ') : typeof item === 'object' ? JSON.stringify(item) : item}</dd>{/each}
        </dl>{/each}
    </Dialog>
{:else if action.type === 'remote-needed'}
    <Dialog title={locale.t('Out of Sync Items') + ' - ' + deviceName(action.device)} large status="info" icon="fas fa-exchange-alt" {onClose}>
        {#each folders as folder}<RemoteFiles {api} {folder} device={action.device} state={snapshot} single={folders.length === 1} />{/each}
    </Dialog>
{:else if action.type === 'changes'}
    <Dialog title="Recent Changes" large icon="fas fa-info-circle" {onClose}>
        <div class="table-responsive"><table class="table table-condensed table-striped"><thead><tr>{#each ['Device', 'Action', 'Type', 'Folder', 'Path', 'Time'] as label}<th>{locale.t(label)}</th>{/each}</tr></thead>
            <tbody>{#each snapshot.globalChanges as event}<tr><td>{friendly(event.data.modifiedBy)}</td><td>{locale.t(event.data.action)}</td><td>{locale.t(event.data.type)}</td><td>{snapshot.config.folders.find(folder => folder.id === event.data.folder)?.label || event.data.folder}</td><td class="word-break-all">{event.data.path}</td><td>{timestamp(event.time)}</td></tr>{/each}</tbody>
        </table></div>
    </Dialog>
{/if}
