<script>
    import {getContext, onMount} from 'svelte';
    let {title, large = false, status = 'default', icon = '', children, footer, onClose, onCancel} = $props();
    const locale = getContext('locale');
    let dialog;
    onMount(() => { dialog.showModal(); return () => dialog.close(); });
</script>

<dialog bind:this={dialog} class="port-dialog" class:large aria-label={locale.t(title)} onclose={onClose} oncancel={event => { if (onCancel) { event.preventDefault(); onCancel(); } }}>
    <div class="modal-content">
        <div class="modal-header {status === 'default' ? '' : 'alert alert-' + status}">
            <h4 class="modal-title">{#if icon}<span class="panel-icon"><span class={icon}></span></span>{/if}{locale.t(title)}</h4>
        </div>
        <div class="modal-body">{@render children()}</div>
        <div class="modal-footer">
            {#if footer}{@render footer()}{:else}
                <button class="btn btn-default btn-sm" onclick={() => dialog.close()}>
                    <span class="fas fa-times"></span>&nbsp;{locale.t('Close')}
                </button>
            {/if}
        </div>
    </div>
</dialog>
