<script>
    import {getContext, onMount} from 'svelte';
    import {bindTooltip} from '../client/tooltip.mjs';
    let {icon = '', label, text = '', prefix = '', kind = 'help',
        triggerText, tail = false, children} = $props();
    const locale = getContext('locale');
    let trigger;
    let tip;
    onMount(() => bindTooltip(trigger, tip));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard access to passive help) -->
<span bind:this={trigger} class={icon ? `${icon} folder-${kind === 'count' ? 'count' : 'help'}-icon`
    : tail ? 'folder-tail' : 'folder-text'} tabindex="0" role={icon ? 'img' : undefined}
    aria-label={triggerText === undefined ? locale.t(label) : label}>
    {#if triggerText !== undefined}<bdi dir="ltr">{triggerText}</bdi>{/if}
</span>
<div bind:this={tip} popover="manual" role="tooltip"
    class="tooltip in port-tooltip folder-{kind}-tooltip">
    <div class="tooltip-arrow"></div>
    <div class="tooltip-inner">
        {#if children}{@render children()}{:else}{prefix ? locale.t(prefix) + '. ' : ''}{triggerText === undefined ? locale.t(text) : text}{/if}
    </div>
</div>
