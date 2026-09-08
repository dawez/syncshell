<script>
    import {getContext, onMount, untrack} from 'svelte';
    import Dialog from './Dialog.svelte';
    import ConfirmAction from './ConfirmAction.svelte';
    import {copy, getValue, setValue, editorFields, inputValue, changedValue, saveEditor, ignoreLines} from '../client/edit.mjs';
    import {folderPath, updateEditor, editorFieldState, newXattrEntry, xattrDefault, xattrHint, overlappingPath} from '../client/editor-behavior.mjs';
    import {fieldHelp} from '../client/field-help.mjs';
    import Tooltip from './Tooltip.svelte';
    import IdentityControls from './IdentityControls.svelte';
    import SharingEntry from './SharingEntry.svelte';
    import {deviceName} from '../client/devices.mjs';
    let {action, state: snapshot, api, session, onClose, onSaved} = $props();
    const locale = getContext('locale');
    const kind = untrack(() => action.type.includes('device') ? 'device' : 'folder');
    const defaults = untrack(() => !!action.defaults);
    const isNew = untrack(() => action.type.startsWith('add'));
    let draft = $state(copy(untrack(() => action[kind])));
    let tab = $state(untrack(() => action.tab === 'sharing' ? 'Sharing' : action.tab === 'ignores' ? 'Ignore Patterns' : 'General'));
    let removing = $state(false);
    let error = $state('');
    let busy = $state(false);
    let addIgnores = $state(false);
    let autoPath = true;
    let directories = $state([]);
    let stage = $state('edit');
    let ignores = $state('');
    let originalIgnores = [];
    let loadedIgnores = $state(false);
    let saved = false;
    let form;
    let passwords = $state(Object.fromEntries(untrack(() => (draft.devices || []).map(member => [member.deviceID, member.encryptionPassword || '']))));
    let shares = $state(Object.fromEntries(untrack(() => snapshot.config.folders.map(folder => {
        const member = folder.devices.find(device => device.deviceID === draft.deviceID);
        return [folder.id, {selected: !!member, password: member?.encryptionPassword || ''}];
    }))));
    const tabs = (kind === 'folder' ? ['General', 'Sharing', 'File Versioning', 'Ignore Patterns', 'Advanced'] : ['General', 'Sharing', 'Advanced']).filter(name => !defaults || name !== 'Sharing');
    const fields = $derived(editorFields(kind, tab, snapshot.config, snapshot.system.myID).map(field => editorFieldState(field, draft, {kind, isNew, defaults, myID: snapshot.system.myID})).filter(field => !field.hidden && (!defaults || !['id', 'deviceID'].includes(field.path))));
    const title = defaults ? 'Edit ' + (kind === 'folder' ? 'Folder' : 'Device') + ' Defaults' : (isNew ? 'Add ' : 'Edit ') + (kind === 'folder' ? 'Folder' : 'Device');
    const pathQuery = $derived(draft.path || '');
    const overlap = $derived(kind === 'folder' ? overlappingPath(draft, snapshot.config, snapshot.system) : null);
    $effect(() => {
        if (kind !== 'folder' || (!isNew && !defaults) || !pathQuery) return;
        const controller = new AbortController();
        api.get('system/browse', {current: pathQuery}, controller.signal).then(value => { directories = value; })
            .catch(value => { if (!controller.signal.aborted) error = value.message; });
        return () => controller.abort();
    });
    onMount(() => {
        if (kind === 'folder' && isNew && snapshot.config.defaults.folder.path) draft.path = folderPath(snapshot.config.defaults.folder.path, draft.label || draft.id, snapshot.system.pathSeparator);
        if (defaults && kind === 'folder') {
            originalIgnores = snapshot.config.defaults.ignores.lines; ignores = originalIgnores.join('\n'); loadedIgnores = true; return;
        }
        if (kind === 'folder' && !isNew && draft.type !== 'receiveencrypted') {
            api.get('db/ignores', {folder: draft.id}).then(data => {
                originalIgnores = data.ignore || [];
                ignores = originalIgnores.join('\n');
                loadedIgnores = true;
                if (data.error) error = data.error;
            }).catch(failure => { error = failure.message; });
        }
    });
    function tabDisabled(name) {
        return (stage === 'ignores' && name !== 'Ignore Patterns') || (kind === 'folder' && draft.type === 'receiveencrypted' && name === 'Ignore Patterns');
    }
    function change(path, value) {
        if (path === 'path') autoPath = false;
        draft = updateEditor(draft, path, value, {kind, isNew, defaults, autoPath, config: snapshot.config, system: snapshot.system});
    }
    async function loadAddedIgnores() {
        loadedIgnores = false; busy = true; error = '';
        try {
            const data = await api.get('db/ignores', {folder: draft.id});
            originalIgnores = (data.ignore?.length || data.error) ? data.ignore || [] : snapshot.config.defaults?.ignores?.lines || [];
            ignores = originalIgnores.join('\n'); loadedIgnores = true;
            if (data.error) error = data.error;
        } catch (failure) { error = failure.message; }
        finally { busy = false; }
    }
    function sharePassword(id, value) {
        passwords[id] = value;
        const member = draft.devices.find(member => member.deviceID === id);
        if (member) member.encryptionPassword = value;
    }
    function shareDevice(id, selected) {
        draft.devices = selected ? [...draft.devices, {deviceID: id, encryptionPassword: passwords[id] || ''}]
            : draft.devices.filter(device => device.deviceID !== id);
    }
    async function save() {
        if (!form.reportValidity()) return;
        busy = true; error = '';
        try {
            if (defaults) {
                await saveEditor({session, api, state: snapshot, kind, draft, isNew, shares, defaults, ignores: ignoreLines(ignores)});
            } else if (stage === 'ignores') {
                if (!loadedIgnores) return;
                await api.post('db/ignores', {ignore: ignoreLines(ignores)}, {folder: draft.id});
                await session.setPaused('folders', draft.id, !!draft.paused);
            } else if (kind === 'folder' && isNew && addIgnores && draft.type !== 'receiveencrypted') {
                await saveEditor({session, api, state: snapshot, kind, draft: {...copy(draft), paused: true}, isNew, shares});
                stage = 'ignores'; tab = 'Ignore Patterns';
                await loadAddedIgnores();
                return;
            } else {
                if (kind === 'folder' && loadedIgnores && ignores !== originalIgnores.join('\n'))
                    await api.post('db/ignores', {ignore: ignoreLines(ignores)}, {folder: draft.id});
                await saveEditor({session, api, state: snapshot, kind, draft, isNew, shares});
            }
            saved = true; onSaved?.(copy(draft), ignoreLines(ignores)); onClose();
        } catch (failure) { error = failure.message; }
        finally { busy = false; }
    }
    async function cancel() {
        if (busy) return;
        if (!saved && stage === 'ignores' && loadedIgnores) {
            saved = true;
            try {
                await api.post('db/ignores', {ignore: originalIgnores}, {folder: draft.id});
                await session.setPaused('folders', draft.id, !!draft.paused);
            } catch (failure) { session.reportError(failure); }
        }
        onClose();
    }
</script>

{#snippet footer()}
    {#if !defaults && !isNew && stage === 'edit' && draft.deviceID !== snapshot.system.myID}<button class="btn btn-warning btn-sm pull-left" disabled={busy} onclick={() => { removing = true; }}>{locale.t('Remove')}</button>{/if}
    <button class="btn btn-primary btn-sm" disabled={busy || (stage === 'ignores' && !loadedIgnores)} onclick={save}><span class="fas fa-check"></span>&nbsp;{locale.t('Save')}</button>
    <button class="btn btn-default btn-sm" disabled={busy} onclick={cancel}><span class="fas fa-times"></span>&nbsp;{locale.t('Cancel')}</button>
{/snippet}
<Dialog {title} large icon="fas fa-cog" {footer} onClose={cancel} onCancel={cancel}>
    <form bind:this={form} onsubmit={event => { event.preventDefault(); save(); }}>
        <ul class="nav nav-tabs">
            {#each tabs as name}<li class:active={tab === name} class:disabled={tabDisabled(name)}>
                <a href="#editor-{name}" aria-disabled={tabDisabled(name)} onclick={event => { event.preventDefault(); if (!tabDisabled(name)) tab = name; }}>{locale.t(name)}</a>
            </li>{/each}
        </ul>
        {#if error}<p class="text-danger" role="alert">{locale.t(error)}</p>{/if}
        <datalist id="directory-list">{#each directories as directory}<option value={directory}></option>{/each}</datalist>
        <datalist id="editor-groups">{#each [...new Set(snapshot.config[kind === 'folder' ? 'folders' : 'devices'].map(item => item.group).filter(Boolean))] as group}<option value={group}></option>{/each}</datalist>
        <div class="tab-content">
        {#if tab === 'Sharing'}
            <div class="folder-actions">{#each [true, false] as select}<button type="button" class="btn btn-link btn-sm" onclick={() => { if (kind === 'folder') { draft.devices = select ? snapshot.config.devices.map(device => draft.devices.find(member => member.deviceID === device.deviceID) || {deviceID: device.deviceID, encryptionPassword: passwords[device.deviceID] || ''}) : draft.devices.filter(member => member.deviceID === snapshot.system.myID); } else { for (const share of Object.values(shares)) share.selected = select; } }}>{locale.t(select ? 'Select All' : 'Deselect All')}</button>{/each}</div>
            <p class="help-block">{locale.t(kind === 'folder' ? 'Select additional devices to share this folder with.' : 'Select the folders to share with this device.')}</p>
            {#if kind === 'folder'}
                {#each snapshot.config.devices.filter(device => device.deviceID !== snapshot.system.myID) as device}
                    {@const member = draft.devices.find(item => item.deviceID === device.deviceID)}
                    <SharingEntry label={deviceName(device)} id={device.deviceID} selected={!!member} password={passwords[device.deviceID] || ''} encrypted={draft.type === 'receiveencrypted'} required={device.untrusted || snapshot.pendingFolders[draft.id]?.offeredBy?.[device.deviceID]?.remoteEncrypted} remoteState={snapshot.completion[device.deviceID]?.[draft.id]?.remoteState} onSelected={value => shareDevice(device.deviceID,value)} onPassword={value => sharePassword(device.deviceID,value)} />
                {/each}
            {:else}
                {#each snapshot.config.folders as folder}
                    <SharingEntry label={folder.label || folder.id} id={folder.id} selected={shares[folder.id].selected} password={shares[folder.id].password} encrypted={folder.type === 'receiveencrypted'} required={draft.untrusted || snapshot.pendingFolders[folder.id]?.offeredBy?.[draft.deviceID]?.remoteEncrypted} remoteState={snapshot.completion[draft.deviceID]?.[folder.id]?.remoteState} onSelected={value => { shares[folder.id].selected = value; }} onPassword={value => { shares[folder.id].password = value; }} />
                {/each}
            {/if}
        {:else if tab === 'Ignore Patterns'}
            <p class="help-block">{locale.t('Enter ignore patterns, one per line.')} <a href="https://docs.syncthing.net/users/ignoring.html" target="_blank" rel="noreferrer">{locale.t('full documentation')}</a></p>
            {#if stage === 'ignores'}<p>{locale.t('Set Ignores on Added Folder')} · {draft.label || draft.id}</p>{#if !loadedIgnores}<button type="button" class="btn btn-default" disabled={busy} onclick={loadAddedIgnores}>{locale.t('Retry')}</button>{/if}{/if}
            {#if isNew && stage !== 'ignores'}<label><input type="checkbox" bind:checked={addIgnores}> {locale.t('Add Ignore Patterns')}</label>
                <p>{locale.t('Patterns are applied before the folder starts synchronizing.')}</p>
            {:else}<textarea class="form-control" rows="12" aria-label={locale.t('Ignore Patterns')} bind:value={ignores} disabled={draft.type === 'receiveencrypted' || !loadedIgnores}></textarea>{/if}
        {:else}
            {#if kind === 'device' && tab === 'General' && !defaults}<IdentityControls device={draft} {api} />{/if}
            {#each fields as field}
                <div class="form-group">
                    {#if field.type === 'checkbox'}<label><input type="checkbox" checked={field.checked ?? !!getValue(draft, field.path)} disabled={field.disabled} onchange={event => change(field.path, changedValue(field, event.currentTarget))}> {locale.t(field.label)}</label>
                    {:else}
                        <label for={'editor-' + field.path}>{locale.t(field.label)}</label>
                        {#if fieldHelp[field.label]}<Tooltip icon="fas fa-info-circle" label={field.label} text={fieldHelp[field.label].help} />{/if}
                        {#if field.type === 'select'}<select id={'editor-' + field.path} class="form-control" value={inputValue(draft, field)} disabled={field.disabled} onchange={event => change(field.path, event.currentTarget.value)}>
                            {#each field.options as [value, label]}<option {value}>{locale.t(label)}</option>{/each}
                        </select>
                        {:else}<input id={'editor-' + field.path} class="form-control" type={field.type === 'list' ? 'text' : field.type}
                            value={inputValue(draft, field)} disabled={field.disabled} list={field.path === 'path' ? 'directory-list' : field.path === 'group' ? 'editor-groups' : undefined} readonly={!isNew && !defaults && ['id', 'path', 'deviceID'].includes(field.path)}
                            required={!defaults && ['id', 'path', 'deviceID'].includes(field.path)} step={field.path.endsWith('.value') ? '0.01' : undefined} min={field.type === 'number' ? 0 : undefined}
                            oninput={event => change(field.path, changedValue(field, event.currentTarget))}>{/if}
                    {/if}
                    {#if field.type === 'checkbox' && fieldHelp[field.label]}<Tooltip icon="fas fa-info-circle" label={field.label} text={fieldHelp[field.label].help} />{/if}
                    {#if field.path === 'path' && overlap}<p class="text-warning">{locale.t(overlap.type === 'subdirectory' ? 'Warning, this path is a subdirectory of an existing folder "{%otherFolder%}".' : 'Warning, this path is a parent directory of an existing folder "{%otherFolder%}".').replace('{%otherFolder%}', overlap.folder.label || overlap.folder.id)}</p>{/if}
                </div>
            {/each}
            {#if tab === 'File Versioning' && draft.versioning.type}
                {#each draft.versioning.type === 'simple' ? [['keep', 'Keep Versions'], ['cleanoutDays', 'Clean out after']] : draft.versioning.type === 'trashcan' ? [['cleanoutDays', 'Clean out after']] : draft.versioning.type === 'staggered' ? [['maxAge', 'Maximum Age']] : [['command', 'External Versioning Command']] as [key, label]}
                    <div class="form-group"><label for={'version-' + key}>{locale.t(label)}{key === 'maxAge' ? ' (' + locale.t('days') + ')' : ''}</label><input id={'version-' + key} class="form-control" type={key === 'command' ? 'text' : 'number'} min={key === 'keep' ? 1 : 0} required value={key === 'maxAge' ? Math.floor(Number(draft.versioning.params?.[key] || 0) / 86400) : draft.versioning.params?.[key] || ''}
                        oninput={event => { draft = setValue(draft, 'versioning.params.' + key, key === 'maxAge' ? String(Number(event.currentTarget.value) * 86400) : event.currentTarget.value); }}></div>
                {/each}
            {/if}
            {#if kind === 'folder' && tab === 'Advanced' && (draft.syncXattrs || draft.sendXattrs)}
                <p>{locale.t('Extended Attributes Filter')} · <a href="https://docs.syncthing.net/advanced/folder-xattr-filter.html" target="_blank" rel="noreferrer">{locale.t('Help')}</a></p>
                <p>{locale.t('To permit a rule, have the checkbox checked. To deny a rule, leave it unchecked.')}</p>
                {#each draft.xattrFilter?.entries || [] as entry, index}<div class="port-xattr-rule"><input type="checkbox" aria-label={locale.t('permit') + ' ' + (index + 1)} bind:checked={entry.permit}><input class="form-control" aria-label={locale.t('Active filter rules') + ' ' + (index + 1)} bind:value={entry.match}><button type="button" class="btn btn-default" onclick={() => { draft.xattrFilter.entries = draft.xattrFilter.entries.filter((_, i) => i !== index); }}>{locale.t('Remove')}</button></div>{/each}
                <button type="button" class="btn btn-default" onclick={() => { draft = setValue(draft, 'xattrFilter.entries', newXattrEntry(draft.xattrFilter?.entries)); }}>{locale.t('Add filter entry')}</button>
                <p>{locale.t('Default')}: {locale.t(xattrDefault(draft.xattrFilter?.entries))}</p><p>{locale.t(xattrHint(draft.xattrFilter?.entries))}</p>
            {/if}
        {/if}
        </div>
    </form>
</Dialog>

{#if removing}<ConfirmAction action={{type: 'remove-' + kind, [kind]: draft}} {api} {session} devices={snapshot.config.devices} onClose={() => { removing = false; }} onDone={onClose} />{/if}
