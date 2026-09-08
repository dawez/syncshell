<script>
    import {getContext} from 'svelte';
    import Pagination from './Pagination.svelte';
    import Dialog from './Dialog.svelte';
    import TransferProgress from './TransferProgress.svelte';
    import {needIcons} from '../client/transfer.mjs';
    import Tooltip from './Tooltip.svelte';
    import {itemRoutes, itemTitles, pageItems} from '../client/items.mjs';
    import {unitPrefixed} from '../client/format.mjs';
    let {api, folder, kind, total: totalInput, revision: revisionInput = 0, progress = {}, progressEnabled = false, onClose} = $props();
    const locale = getContext('locale');
    const folderID = $derived(folder.id);
    const total = $derived(totalInput);
    const revision = $derived(revisionInput);
    let page = $state(1);
    let perpage = $state(10);
    let items = $state([]);
    let error = $state('');
    let loading = $state(false);
    $effect(() => {
        revision; total;
        const controller = new AbortController();
        loading = true;
        api.get(itemRoutes[kind], {folder: folderID, page, perpage}, controller.signal)
            .then(data => { items = pageItems(kind, data); error = ''; })
            .catch(failure => { if (!controller.signal.aborted) error = failure.message; })
            .finally(() => { if (!controller.signal.aborted) loading = false; });
        return () => controller.abort();
    });
    async function prioritize(file) {
        try {
            const data = await api.post('db/prio', undefined, {folder: folder.id, file, page, perpage});
            items = pageItems('need', data);
        } catch (failure) { error = failure.message; }
    }
</script>

<Dialog title={itemTitles[kind]} large status={kind === 'failed' || (kind === 'local' && folder.type === 'receiveencrypted') ? 'warning' : 'info'}
    icon={kind === 'need' ? 'fas fa-cloud-download-alt' : 'fas fa-exclamation-circle'} {onClose}>
    {#if kind === 'failed'}
        <p>{locale.t('The following items could not be synchronized.')} {locale.t('They are retried automatically and will be synced when the error is resolved.')}</p>
    {:else if kind === 'local'}
        <p>{locale.t(folder.type === 'receiveencrypted' ? 'The following unexpected items were found.' : 'The following items were changed locally.')}</p>
        {#if kind === 'local' && folder.type === 'receiveencrypted'}<p>{locale.t('You should never add or change anything locally in a "{%receiveEncrypted%}" folder.', {receiveEncrypted: locale.t('Receive Encrypted')})}</p>{/if}
    {/if}
    {#if error}<p role="alert" class="text-danger">{error}</p>{/if}
    {#if kind === 'need' && progressEnabled}<TransferProgress legend />{/if}
    <table class="table table-striped table-condensed port-items" aria-busy={loading}>{#if kind === 'local'}<thead><tr><th>{locale.t('Path')}</th><th>{locale.t('Size')}</th></tr></thead>{/if}<tbody>
        {#each items as file}
            <tr>
                {#if kind === 'need'}<td class="small-data"><span aria-hidden="true" class={needIcons[file.action]}></span> {locale.t(file.action)}</td>{/if}
                <td class="word-break-all">
                    {#if kind === 'need'}
                        {#if file.type === 'queued'}
                            <button class="btn btn-link btn-sm" aria-label={locale.t('Move to top of queue')}
                                onclick={() => prioritize(file.name)}><span class="fas fa-eject"></span></button>
                        {/if}
                        <Tooltip label={file.name} text={file.name} triggerText={file.name.split('/').at(-1)} />
                    {:else}{file.path || file.name}{/if}
                </td>
                <td>{#if kind === 'need' && file.type === 'progress' && file.action === 'Sync' && progress[file.name]}<TransferProgress progress={progress[file.name]} />{:else}{kind === 'failed' ? file.error : kind === 'local' ? (['DIRECTORY', 'FILE_INFO_TYPE_DIRECTORY'].includes(file.type) ? '' : unitPrefixed(file.size, true) + 'B') : file.size > 0 ? unitPrefixed(file.size, true) + 'B' : ''}{/if}</td>
            </tr>
        {/each}
    </tbody></table>
    <Pagination {page} {perpage} {total} onPage={next => { page = next; }} onSize={size => { perpage = size; }} />
</Dialog>
