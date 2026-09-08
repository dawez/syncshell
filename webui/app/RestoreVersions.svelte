<script>
    import {getContext, onMount} from 'svelte';
    import Dialog from './Dialog.svelte';
    import {versionGroups, selectVersions, selectedVersions, versionActions} from '../client/versions.mjs';
    import {timestamp, unitPrefixed} from '../client/format.mjs';
    let {api, folder, onClose} = $props();
    const locale = getContext('locale');
    let versions = $state(null), selections = $state({}), errors = $state({});
    let error = $state(''), busy = $state(false), confirm = $state(false);
    let search = $state(''), start = $state(''), end = $state('');
    const groups = $derived(versionGroups(versions, search, start, end));
    const chosen = $derived(selectedVersions(selections));
    const count = $derived(Object.keys(chosen).length);
    onMount(() => {
        const controller = new AbortController();
        api.get('folder/versions', {folder: folder.id}, controller.signal)
            .then(value => { versions = value; })
            .catch(value => { if (!controller.signal.aborted) error = value.message; });
        return () => controller.abort();
    });
    async function restore() {
        busy = true; error = '';
        try {
            errors = await api.post('folder/versions', chosen, {folder: folder.id});
            confirm = false;
            if (!Object.keys(errors).length) onClose();
            else {
                selections = Object.fromEntries(Object.entries(chosen).filter(([path]) => errors[path]));
                versions = await api.get('folder/versions', {folder: folder.id});
            }
        } catch (value) { error = value.message; }
        finally { busy = false; }
    }
</script>
<Dialog title={locale.t('Restore Versions') + ' - ' + (folder.label || folder.id)} icon="fas fa-undo" large {onClose} onCancel={() => { if (!busy) onClose(); }}>
    {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
    {#if Object.keys(errors).length}<p>{locale.t('Some items could not be restored:')}</p><table class="table table-striped"><tbody>{#each Object.entries(errors) as [path, message]}<tr><td class="word-break-all">{path}</td><td class="word-break-all text-danger">{message}</td></tr>{/each}</tbody></table>{/if}
    {#if versions === null && !error}<p role="status">{locale.t('Loading data...')}</p>
    {:else if versions && !Object.keys(versions).length}<p>{locale.t('There are no file versions to restore.')}</p>
    {:else if versions}
        <fieldset disabled={busy || confirm}>
            <div class="port-version-filters">
                <label>{locale.t('Filter by name')}<input class="form-control" type="search" bind:value={search}></label>
                <label>{locale.t('Filter by date')} · {locale.t('From')}<input class="form-control" type="datetime-local" step="1" bind:value={start}></label>
                <label>{locale.t('Filter by date')} · {locale.t('To')}<input class="form-control" type="datetime-local" step="1" bind:value={end}></label>
            </div>
            <div class="folder-actions">{#each versionActions as [action, label]}<button class="btn btn-default btn-sm" onclick={() => { selections = selectVersions(selections, groups.flatMap(([, files]) => files), action); }}>{locale.t(label)}</button>{/each}</div>
            {#each groups as [parent, files] (parent)}<details class="port-version-group" open><summary><span aria-hidden="true" class="fas fa-folder"></span> {parent || folder.label || folder.id}</summary>
                <div class="folder-actions">{#each versionActions as [action, label]}<button class="btn btn-default btn-xs" onclick={() => { selections = selectVersions(selections, files, action); }}>{locale.t(label)}</button>{/each}</div>
                {#each files as file, index (file.path)}<div class="port-version-row" class:section-stripe={index % 2 === 0}><span class="folder-text" title={file.path}>{file.path.slice(file.path.lastIndexOf('/') + 1)}</span>
                    <select class="form-control input-sm" aria-label={file.path} value={selections[file.path] || ''} onchange={event => { selections[file.path] = event.currentTarget.value; }}>
                        <option value="">{locale.t('Do not restore')}</option>
                        {#if selections[file.path] && !file.versions.some(version => version.versionTime === selections[file.path])}<option value={selections[file.path]}>{timestamp(selections[file.path])}</option>{/if}
                        {#each file.versions as version}<option value={version.versionTime}>{timestamp(version.versionTime)} · {unitPrefixed(version.size, true)}B</option>{/each}
                    </select>
                </div>{/each}
            </details>{/each}
        </fieldset>
    {/if}
    {#if confirm}<div class="alert alert-warning" role="alert">{locale.t('Are you sure you want to restore {%count%} files?', {count}).replace('{%count%}', count)}</div>{/if}
    {#snippet footer()}
        {#if confirm}<button class="btn btn-warning btn-sm" disabled={busy} onclick={restore}>{locale.t('Yes')}</button><button class="btn btn-default btn-sm" disabled={busy} onclick={() => { confirm = false; }}>{locale.t('No')}</button>
        {:else}<button class="btn btn-primary btn-sm" disabled={busy || !count} onclick={() => { confirm = true; }}>{locale.t('Restore')} ({count})</button><button class="btn btn-default btn-sm" disabled={busy} onclick={onClose}>{locale.t('Close')}</button>{/if}
    {/snippet}
</Dialog>
