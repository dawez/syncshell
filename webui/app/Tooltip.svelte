<script>
    import {onMount} from 'svelte';
    import {bindTooltip} from '../client/tooltip.mjs';
    let {icon, label, text = '', kind = 'help', children} = $props();
    let trigger;
    let tip;
    onMount(() => bindTooltip(trigger, tip));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard access to passive help) -->
<span bind:this={trigger} class="{icon} folder-{kind === 'count' ? 'count' : 'help'}-icon"
    tabindex="0" role="img" aria-label={label}></span>
<div bind:this={tip} popover="manual" role="tooltip"
    class="tooltip in port-tooltip folder-{kind}-tooltip">
    <div class="tooltip-arrow"></div>
    <div class="tooltip-inner">
        {#if children}{@render children()}{:else}{text}{/if}
    </div>
</div>
