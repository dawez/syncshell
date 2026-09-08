<script>
    import {getContext} from 'svelte';
    import {deviceName} from '../client/devices.mjs';
    import {unitPrefixed, timestamp} from '../client/format.mjs';
    import Pagination from './Pagination.svelte';
    let {api, folder, device, state: snapshot, single} = $props();
    const locale = getContext('locale');
    const folderID = $derived(folder.id), deviceID = $derived(device.deviceID);
    let page = $state(1), perpage = $state(10), files = $state([]), error = $state('');
    const revision = $derived(snapshot.completion[device.deviceID]?.[folder.id]?.needItems + ':' + snapshot.completion[device.deviceID]?.[folder.id]?.needBytes);
    $effect(() => {
        revision;
        const controller = new AbortController();
        api.get('db/remoteneed', {folder: folderID, device: deviceID, page, perpage}, controller.signal)
            .then(data => { files = data.files || []; }).catch(failure => { if (!controller.signal.aborted) error = failure.message; });
        return () => controller.abort();
    });
    const friendly = id => deviceName(snapshot.config.devices.find(item => item.deviceID.startsWith(id || '\0'))) || id || locale.t('Unknown');
</script>
<details class="panel panel-default" open={single}>
    <summary class="panel-heading">{folder.label || folder.id}</summary>
    <div class="panel-body less-padding">
        {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
        <table class="table table-striped"><thead><tr>{#each ['Path', 'Size', 'Mod. Time', 'Mod. Device'] as label}<th>{locale.t(label)}</th>{/each}</tr></thead>
            <tbody>{#each files as file}<tr><td class="word-break-all">{file.name}</td><td>{file.type === 'DIRECTORY' ? '' : unitPrefixed(file.size, true) + 'B'}</td><td>{timestamp(file.modified)}</td><td>{friendly(file.modifiedBy)}</td></tr>{/each}</tbody>
        </table>
        <Pagination {page} {perpage} total={snapshot.completion[device.deviceID]?.[folder.id]?.needItems || files.length}
            onPage={value => { page = value; }} onSize={value => { perpage = value; }} />
    </div>
</details>
