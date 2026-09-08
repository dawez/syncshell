<script>
    import Tooltip from './Tooltip.svelte';
    let {encrypted = false, remoteState = ''} = $props();
</script>
{#if encrypted}<Tooltip icon="fas fa-lock" label="Encrypted" text="Encrypted" />{/if}
{#if remoteState === 'paused'}<Tooltip icon="fas fa-pause" label="Paused" text="The remote device has paused this folder." />{/if}
{#if remoteState === 'notSharing'}<Tooltip icon="fas fa-exclamation-triangle" label="Not shared" text="The remote device has not accepted sharing this folder." />{/if}
