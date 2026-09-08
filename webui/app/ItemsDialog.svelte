<script>
    import {getContext} from 'svelte';
    import Pagination from './Pagination.svelte';
    import Dialog from './Dialog.svelte';
    import Tooltip from './Tooltip.svelte';
    import {itemRoutes, itemTitles, pageItems} from '../client/items.mjs';
    import {unitPrefixed} from '../client/format.mjs';
    let {api, folder, kind, total, onClose} = $props();
    const locale = getContext('locale');
    let page = $state(1);
    let perpage = $state(10);
    let items = $state([]);
    let error = $state('');
    let loading = $state(false);
    $effect(() => {
        const controller = new AbortController();
        loading = true;
        api.get(itemRoutes[kind], {folder: folder.id, page, perpage}, controller.signal)
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

<Dialog title={itemTitles[kind]} large status={kind === 'failed' ? 'warning' : 'info'}
    icon={kind === 'need' ? 'fas fa-cloud-download-alt' : 'fas fa-exclamation-circle'} {onClose}>
    {#if kind === 'failed'}
        <p>{locale.t('The following items could not be synchronized.')} {locale.t('They are retried automatically and will be synced when the error is resolved.')}</p>
    {:else if kind === 'local'}
        <p>{locale.t(folder.type === 'receiveencrypted' ? 'The following unexpected items were found.' : 'The following items were changed locally.')}</p>
    {/if}
    {#if error}<p role="alert" class="text-danger">{error}</p>{/if}
    <table class="table table-striped table-condensed" aria-busy={loading}><tbody>
        {#each items as file}
            <tr>
                {#if kind === 'need'}<td class="small-data">{file.action}</td>{/if}
                <td class="word-break-all">
                    {#if kind === 'need'}
                        {#if file.type === 'queued'}
                            <button class="btn btn-link btn-sm" aria-label={locale.t('Move to top of queue')}
                                onclick={() => prioritize(file.name)}><span class="fas fa-eject"></span></button>
                        {/if}
                        <Tooltip label={file.name} text={file.name} triggerText={file.name.split('/').at(-1)} />
                    {:else}{file.path || file.name}{/if}
                </td>
                <td>{kind === 'failed' ? file.error : file.type === 'DIRECTORY' ? '' : unitPrefixed(file.size, true) + 'B'}</td>
            </tr>
        {/each}
    </tbody></table>
    <Pagination {page} {perpage} {total} onPage={next => { page = next; }} onSize={size => { perpage = size; }} />
</Dialog>
