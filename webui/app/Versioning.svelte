<script>
    import {getContext} from 'svelte';
    import {duration} from '../client/format.mjs';
    import {versioningTypes} from '../client/folder-view.mjs';
    import Tooltip from './Tooltip.svelte';
    let {config} = $props();
    const locale = getContext('locale');
    const path = $derived(config.fsPath || '.stversions');
    const days = value => value * 86400;
    const time = value => duration(value, 's', locale.language);
</script>

<span title={config.type === 'external' ? config.params.command : ''}>{locale.t(versioningTypes[config.type] || '')}</span>
{#if config.type !== 'external'}
    {#if ['trashcan', 'simple'].includes(config.type)}
        <span title={locale.t('Clean out after')}>&ensp;<span class="fa fa-calendar"></span>&nbsp;{Number(config.params.cleanoutDays) === 0 ? locale.t('Disabled') : duration(days(config.params.cleanoutDays), 'd', locale.language)}</span>
    {/if}
    {#if config.type === 'simple'}<span title={locale.t('Keep Versions')}>&ensp;<span class="fa fa-file-archive-o"></span>&nbsp;{config.params.keep}</span>{/if}
    {#if config.type === 'staggered'}<span title={locale.t('Maximum Age')}>&ensp;<span class="fa fa-calendar"></span>&nbsp;{Number(config.params.maxAge) === 0 ? locale.t('Forever') : time(config.params.maxAge)}</span>{/if}
    <span title={locale.t('Cleanup Interval')}>&ensp;<span class="fa fa-recycle"></span>&nbsp;{config.cleanupIntervalS === 0 ? locale.t('Disabled') : time(config.cleanupIntervalS)}</span>
    <span class="folder-change"><span class="fa fa-folder-open-o"></span><Tooltip label={path} text={path} triggerText={path.split(/[\\/]/).at(-1)} tail /></span>
{/if}
