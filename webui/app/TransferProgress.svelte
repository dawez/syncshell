<script>
    import {getContext} from 'svelte';
    import {transferSegments} from '../client/transfer.mjs';
    import {unitPrefixed} from '../client/format.mjs';
    let {progress, legend = false} = $props();
    const locale = getContext('locale');
</script>
<div class="progress" role={legend ? undefined : 'progressbar'} aria-label={legend ? undefined : locale.t('Downloading')} aria-valuemin={legend ? undefined : 0} aria-valuemax={legend ? undefined : progress.bytesTotal} aria-valuenow={legend ? undefined : progress.bytesDone}>
    {#each transferSegments as [key, label, color]}<div class="progress-bar {color ? 'progress-bar-' + color : ''}" style:width={(legend ? 20 : Number.isFinite(progress[key]) ? progress[key] : 0) + '%'} title={locale.t(label)}>{#if legend}<span class="show">{locale.t(label)}</span>{/if}</div>{/each}
    {#if !legend}<span class="show frontal">{unitPrefixed(progress.bytesDone, true)}B / {unitPrefixed(progress.bytesTotal, true)}B</span>{/if}
</div>
