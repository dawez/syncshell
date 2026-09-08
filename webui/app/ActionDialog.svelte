<script>
    import {getContext} from 'svelte';
    import Dialog from './Dialog.svelte';
    import About from './About.svelte';
    import IdentityControls from './IdentityControls.svelte';
    import ServiceDialog from './ServiceDialog.svelte';
    import Logs from './Logs.svelte';
    import Editor from './Editor.svelte';
    import Settings from './Settings.svelte';
    import ConfirmAction from './ConfirmAction.svelte';
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
</script>

{#if ['restart', 'shutdown', 'upgrade'].includes(action.type)}
    <ServiceDialog kind={action.type} state={snapshot} {session} {onClose} />
{:else if action.type === 'logs'}
    <Logs {api} {onClose} />
{:else if action.type === 'settings' || action.type === 'advanced'}
    <Settings state={snapshot} {api} {session} {onClose} advanced={action.type === 'advanced'} />
{:else if action.type.startsWith('edit-') || action.type.startsWith('add-')}
    <Editor {action} state={snapshot} {api} {session} {onClose} />
{:else if ['override', 'revert'].includes(action.type)}
    <ConfirmAction {action} {api} {session} {onClose} onDone={onClose} />
{:else if action.type === 'versions'}
    <RestoreVersions {api} folder={action.folder} {onClose} />
{:else if action.type === 'about'}
    <About {api} version={snapshot.version} {onClose} />
{:else if action.type === 'identification'}
    <Dialog title={locale.t('Device Identification') + ' - ' + deviceName(action.device)} large status="info" icon="fas fa-qrcode" {onClose}>
        <div class="text-center"><div class="well well-sm text-monospace"><strong>{action.device.deviceID}</strong></div>
            <img class="img-thumbnail" src={'qr/?text=' + encodeURIComponent(action.device.deviceID)} height="328" width="328" alt={locale.t('QR code')}>
            <IdentityControls device={action.device} {api} />
        </div>
    </Dialog>
{:else if action.type === 'listeners' || action.type === 'discovery'}
    <Dialog title={action.type === 'listeners' ? health.failed.length ? 'Listener Failures' : 'Listener Status' : health.failed.length ? 'Discovery Failures' : 'Discovery Status'} status={health.failed.length ? 'danger' : 'default'} icon="fas fa-sitemap" {onClose}>
        {#if action.type === 'listeners'}<p>{locale.t(health.running ? 'Syncthing is listening on the following network addresses for connection attempts from other devices:' : 'Syncthing is not listening for connection attempts from other devices on any address.  Only outgoing connections from this device may work.')}</p>
        {:else}<p>{locale.t(health.running ? 'The following methods are used to discover other devices on the network and announce this device to be found by others:' : 'This device cannot automatically discover other devices or announce its own address to be found by others.  Only devices with statically configured addresses can connect.')}</p><p>{locale.t('Failure to connect to IPv6 servers is expected if there is no IPv6 connectivity.')}</p>{/if}
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
