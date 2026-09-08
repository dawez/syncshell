<script>
    import {getContext} from 'svelte';
    import {paginationPages} from '../client/pagination.mjs';
    let {page, perpage, total, onPage, onSize} = $props();
    const locale = getContext('locale');
    const pages = $derived(paginationPages(page, total, perpage));
    const last = $derived(Math.ceil(total / perpage));
    function change(event, next) {
        event.preventDefault();
        if (typeof next === 'number' && next >= 1 && next <= last && next !== page) onPage(next);
    }
</script>

{#if pages.length > 1}
    <ul class="pagination">
        <li class:disabled={page === 1}><a href="#previous" aria-label={locale.t('Previous')} aria-disabled={page === 1}
            onclick={event => change(event, page - 1)}>&lsaquo;</a></li>
        {#each pages as number, index}
            <li class:active={number === page} class:disabled={number === '...'}>
                <a href="#page-{index}" aria-current={number === page ? 'page' : undefined}
                    aria-disabled={number === '...'} onclick={event => change(event, number)}>{number}</a></li>
        {/each}
        <li class:disabled={page === last}><a href="#next" aria-label={locale.t('Next')} aria-disabled={page === last}
            onclick={event => change(event, page + 1)}>&rsaquo;</a></li>
    </ul>
{/if}
<ul class="pagination pull-right">
    {#each [10, 25, 50] as size}<li class:active={size === perpage}>
        <a href="#page-size" onclick={event => { event.preventDefault(); onPage(Math.min(page, Math.max(1, Math.ceil(total / size)))); onSize(size); }}>{size}</a></li>{/each}
</ul><div class="clearfix"></div>
