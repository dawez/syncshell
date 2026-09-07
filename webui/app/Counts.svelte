<script>
    import Tooltip from './Tooltip.svelte';
    import {compactNumber, unitPrefixed} from '../client/format.mjs';
    let {info, prefix = 'global'} = $props();
    const files = $derived(info?.[prefix + 'Files']);
    const folders = $derived(info?.[prefix + 'Directories']);
    const bytes = $derived(info?.[prefix + 'Bytes']);
</script>

{#snippet full()}
    <div><span><span class="far fa-fw fa-copy"></span> Files:</span><span>{(files || 0).toLocaleString()}</span></div>
    <div><span><span class="far fa-fw fa-folder"></span> Folders:</span><span>{(folders || 0).toLocaleString()}</span></div>
    <div><span><span class="far fa-fw fa-hdd"></span> Total:</span><span>~{unitPrefixed(bytes, true)}B</span></div>
{/snippet}
<Tooltip icon="far fa-copy" label="Files" kind="count" children={full} />&nbsp;{compactNumber(files)}&ensp;
<Tooltip icon="far fa-hdd" label="Total" kind="count" children={full} />&nbsp;~{unitPrefixed(bytes, true)}B
