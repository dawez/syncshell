<script>
    import {getContext, onMount, untrack} from 'svelte';
    import Dialog from './Dialog.svelte';
    import ConfirmAction from './ConfirmAction.svelte';
    import {copy, getValue, setValue, editorFields, inputValue, changedValue, saveEditor, ignoreLines} from '../client/edit.mjs';
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
    let addIgnores = $state(true);
    let stage = $state('edit');
    let ignores = $state('');
    let originalIgnores = [];
    let loadedIgnores = $state(false);
    let saved = false;
    let form;
    let shares = $state(Object.fromEntries(untrack(() => snapshot.config.folders.map(folder => {
        const member = folder.devices.find(device => device.deviceID === draft.deviceID);
        return [folder.id, {selected: !!member, password: member?.encryptionPassword || ''}];
    }))));
    const tabs = (kind === 'folder' ? ['General', 'Sharing', 'File Versioning', 'Ignore Patterns', 'Advanced'] : ['General', 'Sharing', 'Advanced']).filter(name => !defaults || name !== 'Sharing');
    const fields = $derived(editorFields(kind, tab, snapshot.config, snapshot.system.myID).filter(field => !defaults || !['id', 'deviceID'].includes(field.path)));
    const title = defaults ? 'Edit ' + (kind === 'folder' ? 'Folder' : 'Device') + ' Defaults' : (isNew ? 'Add ' : 'Edit ') + (kind === 'folder' ? 'Folder' : 'Device');
    onMount(() => {
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
    function shareDevice(id, selected) {
        draft.devices = selected ? [...draft.devices, {deviceID: id, encryptionPassword: ''}]
            : draft.devices.filter(device => device.deviceID !== id);
    }
    async function save() {
        if (!form.reportValidity()) return;
        busy = true; error = '';
        try {
            if (defaults) {
                await saveEditor({session, api, state: snapshot, kind, draft, isNew, shares, defaults, ignores: ignoreLines(ignores)});
            } else if (stage === 'ignores') {
                await api.post('db/ignores', {ignore: ignoreLines(ignores)}, {folder: draft.id});
                await session.setPaused('folders', draft.id, !!draft.paused);
            } else if (kind === 'folder' && isNew && addIgnores && draft.type !== 'receiveencrypted') {
                await saveEditor({session, api, state: snapshot, kind, draft: {...copy(draft), paused: true}, isNew, shares});
                stage = 'ignores'; tab = 'Ignore Patterns';
                const data = await api.get('db/ignores', {folder: draft.id});
                originalIgnores = (data.ignore?.length || data.error) ? data.ignore || [] : snapshot.config.defaults?.ignores?.lines || [];
                ignores = originalIgnores.join('\n'); loadedIgnores = true;
                if (data.error) error = data.error;
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
            {#each tabs as name}<li class:active={tab === name} class:disabled={stage === 'ignores' && name !== 'Ignore Patterns'}>
                <a href="#editor-{name}" onclick={event => { event.preventDefault(); if (stage !== 'ignores' || name === 'Ignore Patterns') tab = name; }}>{locale.t(name)}</a>
            </li>{/each}
        </ul>
        {#if error}<p class="text-danger" role="alert">{locale.t(error)}</p>{/if}
        <div class="tab-content">
        {#if tab === 'Sharing'}
            <p class="help-block">{locale.t(kind === 'folder' ? 'Select additional devices to share this folder with.' : 'Select the folders to share with this device.')}</p>
            {#if kind === 'folder'}
                {#each snapshot.config.devices.filter(device => device.deviceID !== snapshot.system.myID) as device}
                    {@const member = draft.devices.find(item => item.deviceID === device.deviceID)}
                    <div class="form-group"><label><input type="checkbox" checked={!!member} onchange={event => shareDevice(device.deviceID, event.currentTarget.checked)}> {deviceName(device)}</label>
                        {#if member && draft.type !== 'receiveencrypted'}<input class="form-control" type="password" aria-label={locale.t('Encryption Password') + ': ' + deviceName(device)} placeholder={locale.t('Encryption Password')} bind:value={member.encryptionPassword} required={device.untrusted}>{/if}
                    </div>
                {/each}
            {:else}
                {#each snapshot.config.folders as folder}
                    <div class="form-group"><label><input type="checkbox" bind:checked={shares[folder.id].selected}> {folder.label || folder.id}</label>
                        {#if shares[folder.id].selected && folder.type !== 'receiveencrypted'}<input class="form-control" type="password" aria-label={locale.t('Encryption Password') + ': ' + (folder.label || folder.id)} placeholder={locale.t('Encryption Password')} bind:value={shares[folder.id].password} required={draft.untrusted}>{/if}
                    </div>
                {/each}
            {/if}
        {:else if tab === 'Ignore Patterns'}
            <p class="help-block">{locale.t('Ignore Patterns')}</p>
            {#if isNew && stage !== 'ignores'}<label><input type="checkbox" bind:checked={addIgnores}> {locale.t('Add Ignore Patterns')}</label>
                <p>{locale.t('Patterns are applied before the folder starts synchronizing.')}</p>
            {:else}<textarea class="form-control" rows="12" aria-label={locale.t('Ignore Patterns')} bind:value={ignores} disabled={draft.type === 'receiveencrypted' || !loadedIgnores}></textarea>{/if}
        {:else}
            {#each fields as field}
                <div class="form-group">
                    {#if field.type === 'checkbox'}<label><input type="checkbox" checked={!!getValue(draft, field.path)} onchange={event => { draft = setValue(draft, field.path, changedValue(field, event.currentTarget)); }}> {locale.t(field.label)}</label>
                    {:else}
                        <label for={'editor-' + field.path}>{locale.t(field.label)}</label>
                        {#if field.type === 'select'}<select id={'editor-' + field.path} class="form-control" value={inputValue(draft, field)} onchange={event => { draft = setValue(draft, field.path, event.currentTarget.value); }}>
                            {#each field.options as [value, label]}<option {value}>{locale.t(label)}</option>{/each}
                        </select>
                        {:else}<input id={'editor-' + field.path} class="form-control" type={field.type === 'list' ? 'text' : field.type}
                            value={inputValue(draft, field)} readonly={!isNew && !defaults && ['id', 'path', 'deviceID'].includes(field.path)}
                            required={!defaults && ['id', 'path', 'deviceID'].includes(field.path)} step={field.path.endsWith('.value') ? '0.01' : undefined} min={field.type === 'number' ? 0 : undefined}
                            oninput={event => { draft = setValue(draft, field.path, changedValue(field, event.currentTarget)); }}>{/if}
                    {/if}
                </div>
            {/each}
            {#if tab === 'File Versioning' && draft.versioning.type}
                {#each draft.versioning.type === 'simple' ? [['keep', 'Keep Versions'], ['cleanoutDays', 'Clean out after']] : draft.versioning.type === 'trashcan' ? [['cleanoutDays', 'Clean out after']] : draft.versioning.type === 'staggered' ? [['maxAge', 'Maximum Age (s)']] : [['command', 'External Versioning Command']] as [key, label]}
                    <div class="form-group"><label for={'version-' + key}>{locale.t(label)}</label><input id={'version-' + key} class="form-control" value={draft.versioning.params?.[key] || ''}
                        oninput={event => { draft = setValue(draft, 'versioning.params.' + key, event.currentTarget.value); }}></div>
                {/each}
            {/if}
        {/if}
        </div>
    </form>
</Dialog>

{#if removing}<ConfirmAction action={{type: 'remove-' + kind, [kind]: draft}} {api} {session} devices={snapshot.config.devices} onClose={() => { removing = false; }} onDone={onClose} />{/if}
