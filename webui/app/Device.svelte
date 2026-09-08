<script>
    import ShareStatus from './ShareStatus.svelte';
    import {getContext, untrack} from 'svelte';
    import {deviceName, sharedFolders, deviceStatus, deviceLabels, deviceIcons, deviceColor,
        connectionType, connectionLabels, connectionIcons, lastSeenDays, addressError, remoteGui,
        serviceHealth} from '../client/devices.mjs';
    import {localStateTotal} from '../client/folders.mjs';
    import {unitPrefixed, compactNumber, duration, timestamp} from '../client/format.mjs';
    import {stripeSections} from '../client/stripes.mjs';
    import Field from './Field.svelte';
    import Counts from './Counts.svelte';
    import Tooltip from './Tooltip.svelte';
    import Identicon from './Identicon.svelte';
    let {device, state: snapshot, session, local = false, metric, toggleUnits, onAction} = $props();
    const locale = getContext('locale');
    let open = $state(untrack(() => local));
    let foldersOpen = $state(false);
    const conn = $derived(local ? snapshot.connectionsTotal : snapshot.connections[device.deviceID] || {});
    const completion = $derived(snapshot.completion[device.deviceID] || {});
    const folders = $derived(sharedFolders(snapshot.config, device.deviceID));
    const status = $derived(deviceStatus(device, snapshot));
    const type = $derived(connectionType(conn));
    const age = $derived(lastSeenDays(snapshot.deviceStats[device.deviceID]?.lastSeen));
    const totals = $derived(localStateTotal(snapshot.model));
    const listeners = $derived(serviceHealth(snapshot.system.connectionServiceStatus));
    const discovery = $derived(serviceHealth(snapshot.system.discoveryStatus));
    const gui = $derived(remoteGui(device, conn));
    const addresses = $derived([...(device.addresses || []).map(address => ({address, source: 'Configured'})),
        ...(snapshot.discoveryCache[device.deviceID]?.addresses || []).map(address => ({address, source: 'Discovered'}))]);
    function stripes(node) { return {destroy: stripeSections(node)}; }
    const perform = promise => promise.catch(() => {});
    const openAction = (type, extra = {}) => onAction({type, device, ...extra});
    const rate = bytes => unitPrefixed(metric ? bytes * 8 : bytes, !metric) + (metric ? 'bps' : 'B/s');
</script>

<div class="panel panel-default">
    <button class="btn panel-heading" aria-expanded={open} onclick={() => { open = !open; }}>
        {#if !local && status === 'syncing'}<span class="panel-progress" style:width="{completion._total}%"></span>{/if}
        <span class="panel-title device-title">
            <Identicon id={device.deviceID} />
            {#if !local}
                <span class="panel-status pull-right text-{deviceColor(device, snapshot)}">
                    <span class="hidden-xs">{locale.t(deviceLabels[status])}</span>
                    {#if status === 'syncing'} ({completion._total}%, {unitPrefixed(completion._needBytes, true)}B){/if}
                    <span class="visible-xs fa fa-fw {deviceIcons[status]}" aria-label={locale.t(deviceLabels[status])}></span>
                    <span class="inline-icon"><span class="reception reception-theme {connectionIcons[type] || ''}"></span></span>
                </span>
            {/if}
            <span class="panel-title-text"><span class="device-name" title={deviceName(device)}>{deviceName(device)}</span>
                <small class="device-role text-success">({locale.t(local ? 'This Device' : 'Remote')})</small></span>
        </span>
    </button>
    {#if open}
        <div class="panel-collapse" use:stripes><div class="panel-body less-padding">
            {#if !local}<table class="table table-condensed visible-xs remote-status"><tbody>
                <Field label="Device Status" icon="fa fa-fw {deviceIcons[status]}">{locale.t(deviceLabels[status])}</Field>
            </tbody></table>{/if}
            {#if local || conn.connected || folders.length || completion._needItems}
                <details class="device-details" open><summary>{locale.t('Current activity')}</summary>
                    <table class="table table-condensed table-auto"><tbody>
                        {#if !local && !conn.connected && folders.length}
                            <Field label="Sync Status">{completion._total === 100 ? locale.t('Up to Date') : completion._total < 100 ? locale.t('Out of Sync') + ' (' + completion._total + '%)' : ''}</Field>
                        {/if}
                        {#if local || conn.connected}
                            {#each ['in', 'out'] as direction}
                                <Field label={direction === 'in' ? 'Download Rate' : 'Upload Rate'}
                                    icon="fas fa-fw fa-cloud-{direction === 'in' ? 'download' : 'upload'}-alt"
                                    help={direction === 'in' ? (local ? 'Incoming traffic across all connected devices. Click the rate to switch between bytes and bits per second. A configured limit appears below.' : 'Data received by this machine from this remote device. Click the rate to switch between bytes and bits per second.') : (local ? 'Outgoing traffic across all connected devices. Click the rate to switch between bytes and bits per second. A configured limit appears below.' : 'Data sent by this machine to this remote device. Click the rate to switch between bytes and bits per second.')}
                                    totalBytes={conn[direction + 'BytesTotal']}>
                                    <a href="#units" onclick={event => { event.preventDefault(); toggleUnits(); }}>{rate(conn[direction + 'bps'] || 0)}
                                        {#if (local ? snapshot.config.options : device)[direction === 'in' ? 'maxRecvKbps' : 'maxSendKbps'] > 0}
                                            <small><br><i class="text-muted">{locale.t('Limit')}: {rate((local ? snapshot.config.options : device)[direction === 'in' ? 'maxRecvKbps' : 'maxSendKbps'] * 1024)}
                                                {#if local && snapshot.config.options.limitBandwidthInLan} ({locale.t('Applied to LAN')}){/if}</i></small>
                                        {/if}
                                    </a>
                                </Field>
                            {/each}
                        {/if}
                        {#if local}<Field label="Local State (Total)"><Counts prefix="local" info={{localFiles: totals.files, localDirectories: totals.directories, localBytes: totals.bytes}} /></Field>{/if}
                        {#if !local && completion._needItems > 0}<Field label="Out of Sync Items">
                            <a href="#remote-needed" onclick={event => { event.preventDefault(); openAction('remote-needed'); }}>
                                <Tooltip icon="fas fa-fw fa-exchange-alt" label="Out of Sync Items" text="{completion._needItems.toLocaleString()} {locale.t('items')}, ~{unitPrefixed(completion._needBytes, true)}B" />
                                {compactNumber(completion._needItems)} {locale.t('items')}, ~{unitPrefixed(completion._needBytes, true)}B</a>
                        </Field>{/if}
                    </tbody></table>
                </details>
            {/if}
            <details class="device-details" open><summary>{locale.t('Connectivity')}</summary>
                <table class="table table-condensed table-auto"><tbody>
                    {#if local}
                        <Field label="Listeners"><a href="#listeners" class="text-{listeners.color}" onclick={event => { event.preventDefault(); openAction('listeners'); }}>{listeners.running}/{listeners.total}</a></Field>
                        {#if snapshot.system.discoveryEnabled}<Field label="Discovery"><a href="#discovery" class="text-{discovery.color}" onclick={event => { event.preventDefault(); openAction('discovery'); }}>{discovery.running}/{discovery.total}</a></Field>{/if}
                    {:else}
                        <Field label="Address">
                            {#if conn.connected}{conn.address}
                            {:else}{#each addresses as item}
                                <span class="remote-address"><span class="folder-text" title={locale.t(item.source) + ': ' + item.address}>{item.address}</span>
                                    {#if snapshot.system.lastDialStatus?.[item.address]?.error && !device.paused}<small class="text-danger" title={snapshot.system.lastDialStatus[item.address].error}>{addressError(snapshot.system.lastDialStatus[item.address])}</small>{/if}
                                </span>
                            {/each}{/if}
                        </Field>
                        {#if !conn.connected}<Field label="Last seen">
                            {#if !age}{locale.t('Never')}{:else}{timestamp(snapshot.deviceStats[device.deviceID].lastSeen)}
                                {#if age >= 7}<br><i class:text-warning={age >= 30 && age < 365} class:text-danger={age >= 365}>{locale.t(age >= 365 ? 'More than a year ago' : age >= 30 ? 'More than a month ago' : 'More than a week ago')}</i>{/if}
                            {/if}
                        </Field>
                        {:else}
                            <Field label="Connection Type" icon="reception reception-4 reception-theme" help="Transport and network used to reach this device. A relay forwards traffic when a direct connection is unavailable.">{locale.t(connectionLabels[type] || 'Disconnected')}</Field>
                            <Field label="Number of Connections">1{conn.secondary?.length ? ' + ' + conn.secondary.length : ''}</Field>
                        {/if}
                    {/if}
                </tbody></table>
            </details>
            <details class="device-details"><summary>{locale.t('Device information')}</summary>
                <table class="table table-condensed table-auto"><tbody>
                    {#if local}
                        <Field label="Uptime">{duration(snapshot.system.uptime, 'm', locale.language)}</Field>
                        <Field label="Identification" help="The unique ID used to pair this device with other devices. Click the shortened ID to see the full ID and QR code."><a href="#identification" onclick={event => { event.preventDefault(); openAction('identification'); }}>{device.deviceID.slice(0, 7)}</a></Field>
                        <Field label="Version" help="Version and platform of the Syncthing service running on this device.">{snapshot.version.version} ({snapshot.version.os} {snapshot.version.arch})</Field>
                    {:else}
                        {#if conn.clientVersion}<Field label="Version">{conn.clientVersion}</Field>{/if}
                        {#if device.introducedBy}<Field label="Introduced By">{deviceName(snapshot.config.devices.find(item => item.deviceID === device.introducedBy)) || device.introducedBy.slice(0, 7)}</Field>{/if}
                        <Field label="Compression">{locale.t(({always: 'All Data', metadata: 'Metadata Only', never: 'Off'})[device.compression] || '')}</Field>
                        {#if device.allowedNetworks?.length}<Field label="Allowed Networks">{device.allowedNetworks.join(', ')}</Field>{/if}
                        {#each [['introducer', 'Introducer'], ['autoAcceptFolders', 'Auto Accept'], ['untrusted', 'Untrusted']] as [property, label]}
                            {#if device[property]}<Field {label}>{locale.t('Yes')}</Field>{/if}
                        {/each}
                    {/if}
                </tbody></table>
            </details>
        </div>
        {#if !local}<div class="panel-footer folder-actions remote-actions">
            <button class="btn btn-sm btn-default" onclick={() => openAction('identification')}><span class="fas fa-qrcode"></span>&nbsp;{locale.t('Identification')}</button>
            {#if folders.length}<div class="dropup folder-sharing remote-folders" class:open={foldersOpen}>
                <button class="btn btn-sm btn-default dropdown-toggle" aria-expanded={foldersOpen} onclick={() => { foldersOpen = !foldersOpen; }}><span class="fas fa-folder"></span>&nbsp;{locale.t('Folders')} <span class="caret"></span></button>
                <ul class="dropdown-menu">{#each folders as folder}<li><a href="#folder-sharing" onclick={event => { event.preventDefault(); foldersOpen = false; onAction({type: 'edit-folder', folder, tab: 'sharing'}); }}>{folder.label || folder.id} <ShareStatus encrypted={folder.type === 'receiveencrypted' || !!folder.devices.find(member => member.deviceID === device.deviceID)?.encryptionPassword} remoteState={snapshot.completion[device.deviceID]?.[folder.id]?.remoteState} /></a></li>{/each}</ul>
            </div>{/if}
            <span class="pull-right">
                {#if device.remoteGUIPort > 0}<a class="btn btn-sm btn-default" href={gui || undefined} aria-disabled={!gui}><span class="fas fa-desktop"></span>&nbsp;{locale.t('Remote GUI')}</a>{/if}
                <button class="btn btn-sm btn-default" onclick={() => perform(session.setPaused('devices', device.deviceID, !device.paused))}><span class="fas fa-{device.paused ? 'play' : 'pause'}"></span>&nbsp;{locale.t(device.paused ? 'Resume' : 'Pause')}</button>
                <button class="btn btn-sm btn-default" onclick={() => openAction('edit-device')}><span class="fas fa-pencil-alt"></span>&nbsp;{locale.t('Edit')}</button>
            </span>
        </div>{/if}
        </div>
    {/if}
</div>
