<script>
    import {getContext, untrack} from 'svelte';
    import {listConflicts, recheckConflicts, replaceDirectory, parentPath, missingHelp, hostActionHelp} from '../client/conflicts.mjs';
    import {conflictTranslator} from '../client/conflict-words.mjs';
    import {unitPrefixed, timestamp} from '../client/format.mjs';
    import Tooltip from './Tooltip.svelte';
    import Dialog from './Dialog.svelte';
    import '../client/conflicts.css';
    let {api, folders, active, ready, hostActions = null} = $props();
    const locale = getContext('locale');
    const t = $derived(conflictTranslator(locale));
    let groups = $state([]), search = $state(''), selected = $state({});
    let loading = $state(false), errors = $state([]), message = $state(''), rename = $state(null);
    let scanning = $state(null);
    let controller;
    const visible = $derived(groups.filter(group => [group.folderName, group.path, ...group.copies.map(file => file.path)]
        .some(value => value.toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
    const enabled = $derived(active && ready);
    const folderKey = $derived(folders.map(folder => folder.id).join('|'));
    $effect(() => {
        if (!enabled) return;
        folderKey;
        const request = new AbortController(); controller = request;
        untrack(() => load(false, null, request));
        return () => request.abort();
    });
    const chosen = group => group.copies.find(file => file.path === selected[group.id]) || group.copies[0];
    async function load(scan = false, group = null, request = controller) {
        loading = true; scanning = scan ? group?.id || 'all' : null; errors = []; message = '';
        try {
            const result = scan ? await recheckConflicts(api, folders, group, request.signal)
                : await listConflicts(api, folders, request.signal);
            if (request.signal.aborted) return;
            groups = group ? replaceDirectory(groups, group, result.groups) : result.groups;
            errors = result.errors;
            if (scan && !errors.length) message = 'Syncthing scan finished; file list updated.';
        } catch (error) { if (!request.signal.aborted) errors = [error.message]; }
        finally { if (!request.signal.aborted) { loading = false; scanning = null; } }
    }
    async function open(group, file) {
        try { await hostActions.open(group, file); } catch (error) { errors = [error.message]; }
    }
    async function restore() {
        loading = true; errors = [];
        try {
            await hostActions.rename(rename.group, rename.file);
            const group = rename.group; rename = null;
            await load(true, group);
        } catch (error) { errors = [error.message]; }
        finally { loading = false; }
    }
</script>
{#snippet fileLink(group, file)}
    {#if !file}
        <span class="text-warning"><Tooltip icon="fas fa-exclamation-triangle" label="Missing current file" text={t(missingHelp)} /> {t('Missing current file')}</span>
    {:else if !file.available}
        <span class="text-warning" title={t('Waiting for Syncthing to download this file')}>{file.name} · {t('Not available locally')}</span>
    {:else if hostActions}
        <a class="review-file" href="#open-file" title={group.root + '/' + file.path} onclick={event => { event.preventDefault(); open(group, file); }}><span aria-hidden="true" class="fas fa-fw fa-file"></span><span class="review-filename">{file.name}</span></a>
    {:else}
        <span class="review-file" title={group.root + '/' + file.path}><span aria-hidden="true" class="fas fa-fw fa-file"></span><span class="review-filename">{file.name}</span></span>
    {/if}
{/snippet}
{#snippet metadata(file)}{unitPrefixed(file.bytes, true)}B · {timestamp(file.modified)}{/snippet}
<section class="conflict-review" aria-label={t('Conflict files')}>
    <h3>{t('Review in your file manager')}</h3>
    <div class="review-tools">
        <input type="search" class="form-control input-sm review-search" placeholder={t('Search filenames or paths')} aria-label={t('Search filenames or paths')} bind:value={search} />
        <button class="btn btn-default review-recheck" disabled={loading} aria-busy={scanning === 'all'} onclick={() => load(true)}><span class:text-warning={scanning === 'all'}><span aria-hidden="true" class="fas fa-refresh" class:fa-spin={scanning === 'all'}></span> {t('Recheck all files')}</span></button>
    </div>
    {#if loading}<p role="status">{t('Loading data...')}</p>{/if}
    {#if message}<p class="review-message" role="status">{t(message)}</p>{/if}
    {#each errors as error}<p class="review-message text-danger" role="alert">{error}</p>{/each}
    <table class="table table-striped review-table review-design-03" aria-label={t('Conflict files')}>
        <thead><tr class="review-column-headings">{#each ['Location', 'Current file', 'Conflict files', 'Actions'] as heading}<th scope="col">{t(heading)}</th>{/each}</tr></thead>
        <tbody>{#each visible as group (group.id)}
            {@const file = chosen(group)}
            <tr class="review-row">
                <td class="review-context"><span class="review-path" title={group.root + '/' + parentPath(group.path)}>{group.folderName}{parentPath(group.path) ? ' / ' + parentPath(group.path) : ''}</span></td>
                <td class="review-current"><span class="review-cell-label">{t('Current file')}</span>{@render fileLink(group, group.current)}
                    {#if group.current}<small class="review-file-meta">{@render metadata(group.current)}</small>
                    {:else}<small class="review-file-meta review-missing-hint">{t('To keep a conflict file, rename it to:')} <span class="review-filename" title={group.root + '/' + group.path}>{group.name}</span></small>{/if}
                </td>
                <td class="review-copies">
                    {#if group.copies.length > 1}<select class="form-control input-sm review-version" aria-label={t('Conflict files') + ': ' + group.name} value={file.path} title={file.name} onchange={event => { selected[group.id] = event.currentTarget.value; }}>
                        {#each group.copies as copy, index}<option value={copy.path}>{index + 1}/{group.copies.length} · {copy.name}</option>{/each}
                    </select>{:else}<span class="review-mobile-label">{t('Conflict files')}</span>{/if}
                    {@render fileLink(group, file)}
                    <small class="review-file-meta review-conflict-meta">{@render metadata(file)}
                        {#if !group.current && file.available}<button class="btn btn-default review-autoresolve" disabled={!hostActions || loading} title={!hostActions ? t(hostActionHelp) : undefined} onclick={() => { rename = {group, file}; }}><span class="text-warning">{t('Autoresolve')}</span></button>{/if}
                    </small>
                </td>
                <td class="review-actions">
                    <button class="btn btn-default" disabled={!hostActions || loading} title={!hostActions ? t(hostActionHelp) : undefined} onclick={() => open(group)}><span aria-hidden="true" class="fas fa-folder-open"></span> {t('Open folder')}</button>
                    <button class="btn btn-default" disabled={loading} aria-busy={scanning === group.id} onclick={() => load(true, group)}><span class:text-warning={scanning === group.id}><span aria-hidden="true" class="fas fa-refresh" class:fa-spin={scanning === group.id}></span> {t('Recheck files in folder')}</span></button>
                </td>
            </tr>
        {/each}</tbody>
    </table>
    {#if !loading && !visible.length && !errors.length}<p class="text-success">{t(groups.length ? 'No matches' : 'No conflict files remain')}</p>{/if}
</section>
{#if rename}
    <Dialog title={t('Restore original name')} onClose={() => { rename = null; }} onCancel={() => { if (!loading) rename = null; }}>
        <p>{t('Rename the selected conflict file to the original name. Other conflict files remain. An existing file will never be overwritten.')}</p>
        <strong>{t('From')}:</strong><p class="review-confirm-path">{rename.group.root}/{rename.file.path}</p>
        <strong>{t('To')}:</strong><p class="review-confirm-path">{rename.group.root}/{rename.group.path}</p>
        {#each errors as error}<p class="text-danger" role="alert">{error}</p>{/each}
        {#snippet footer()}<button class="btn btn-default" disabled={loading} onclick={() => { rename = null; }}>{t('Cancel')}</button><button class="btn btn-default" disabled={loading} onclick={restore}><span class="text-warning">{t('Rename')}</span></button>{/snippet}
    </Dialog>
{/if}
