<script>
    import {getContext, onMount, untrack} from 'svelte';
    import Dialog from './Dialog.svelte';
    import Editor from './Editor.svelte';
    import FormFields from './FormFields.svelte';
    import {copy, setValue} from '../client/edit.mjs';
    import {settingsTabs, settingsFields, settingsConfig, upgradeMode, ignoredFolders, unignore, loadSettings, advancedSections} from '../client/settings.mjs';
    import {timestamp} from '../client/format.mjs';
    let {state: snapshot, api, session, onClose, advanced = false} = $props();
    const locale = getContext('locale');
    const initial = untrack(() => copy(snapshot.config));
    let draft = $state(copy(initial)), mode = $state(upgradeMode(initial)), tab = $state('General');
    let options = $state({themes: [], upgrade: null}), busy = $state(false), error = $state('');
    let nested = $state(null), report = $state(null), discard = $state(false), form;
    const fields = $derived(settingsFields(tab, draft, snapshot.system.myID, options.themes));
    const sections = $derived(advancedSections(draft));
    const ignored = $derived(ignoredFolders(draft));
    onMount(() => {
        const controller = new AbortController();
        loadSettings(api, controller.signal).then(value => { if (!controller.signal.aborted) options = value; });
        return () => controller.abort();
    });
    function update(path, value) { draft = setValue(draft, path, value); }
    async function save() {
        if (!form.reportValidity()) return;
        busy = true; error = '';
        try {
            const config = advanced ? copy(draft) : settingsConfig(draft, mode, snapshot.system, snapshot.version, !!options.upgrade);
            await session.saveConfig(config);
            onClose();
            if (initial.gui.theme !== config.gui.theme) location.reload();
        } catch (value) { error = value.message; }
        finally { busy = false; }
    }
    function close() {
        if (busy) return;
        if (JSON.stringify(draft) !== JSON.stringify(initial) || mode !== upgradeMode(initial)) discard = true;
        else onClose();
    }
    async function defaults(kind) {
        try { nested = {type: 'edit-' + kind, defaults: true, [kind]: await api.get('config/defaults/' + kind)}; }
        catch (value) { error = value.message; }
    }
    async function generateKey() {
        try { update('gui.apiKey', (await api.get('svc/random/string', {length: 32})).random); }
        catch (value) { error = value.message; }
    }
    async function preview() {
        try { report = await api.get('svc/report', {version: draft.options.urAccepted > 0 ? draft.options.urAccepted : snapshot.system.urVersionMax}); }
        catch (value) { error = value.message; }
    }
</script>
<Dialog title={advanced ? 'Advanced Configuration' : 'Settings'} status={advanced ? 'danger' : 'default'} icon="fas fa-cog" large onClose={onClose} onCancel={close}>
    <form bind:this={form} onsubmit={event => { event.preventDefault(); save(); }}>
        {#if error}<p class="text-danger" role="alert">{locale.t(error)}</p>{/if}
        <fieldset disabled={busy}>
        {#if advanced}
            <p class="text-danger"><strong>{locale.t('Be careful!')}</strong> {locale.t('Incorrect configuration may damage your folder contents and render Syncthing inoperable.')}</p>
            {#each sections as section (section.path)}<details class="panel panel-default"><summary class="panel-heading">{locale.t(section.label)}</summary><div class="panel-body"><FormFields {draft} fields={section.fields} onChange={update} /></div></details>{/each}
        {:else}
            <ul class="nav nav-tabs">{#each settingsTabs as name}<li class:active={tab === name}><a href="#settings-{name}" onclick={event => { event.preventDefault(); tab = name; }}>{locale.t(name)}</a></li>{/each}</ul>
            {#if tab === 'Ignored Devices'}
                {#if !draft.remoteIgnoredDevices?.length}<p>{locale.t('You have no ignored devices.')}</p>{/if}
                <div class="table-responsive"><table class="table table-striped"><tbody>{#each draft.remoteIgnoredDevices || [] as device (device.deviceID)}<tr><td>{timestamp(device.time)}</td><td class="word-break-all" title={device.deviceID}>{device.name || device.deviceID}</td><td class="word-break-all">{device.address}</td><td><button type="button" class="btn btn-default btn-sm" onclick={() => { draft = unignore(draft, device.deviceID); }}>{locale.t('Unignore')}</button></td></tr>{/each}</tbody></table></div>
            {:else if tab === 'Ignored Folders'}
                {#if !ignored.length}<p>{locale.t('You have no ignored folders.')}</p>{/if}
                <div class="table-responsive"><table class="table table-striped"><tbody>{#each ignored as {device, folder}}<tr><td>{timestamp(folder.time)}</td><td>{folder.label || folder.id}</td><td class="word-break-all" title={device.deviceID}>{device.name || device.deviceID}</td><td><button type="button" class="btn btn-default btn-sm" onclick={() => { draft = unignore(draft, device.deviceID, folder.id); }}>{locale.t('Unignore')}</button></td></tr>{/each}</tbody></table></div>
            {:else}
                <FormFields {draft} {fields} onChange={update} />
                {#if tab === 'GUI' && snapshot.system.guiAddressOverridden}<p class="text-warning">{locale.t('The GUI address is overridden by startup options. Changes here will not take effect while the override is in place.')}</p>{/if}
                {#if tab === 'General'}
                    <label for="settings-api-key">{locale.t('API Key')}</label><div class="input-group"><input id="settings-api-key" class="form-control" type="password" readonly value={draft.gui.apiKey}><span class="input-group-btn"><button type="button" class="btn btn-default" onclick={generateKey}>{locale.t('Generate')}</button></span></div>
                    <div class="form-group"><label for="settings-usage">{locale.t('Anonymous Usage Reporting')}</label> <button type="button" class="btn btn-link btn-sm" onclick={preview}>{locale.t('Preview')}</button>
                        {#if mode === 'candidate' || snapshot.version.isCandidate}<p>{locale.t('Usage reporting is always enabled for candidate releases.')}</p>
                        {:else}<select id="settings-usage" class="form-control" bind:value={draft.options.urAccepted}>
                            {#each Array.from({length: Math.max(0, (snapshot.system.urVersionMax || 1) - 1)}, (_, i) => snapshot.system.urVersionMax - i) as version}<option value={version}>{locale.t('Version')} {version}</option>{/each}
                            <option value={0}>{locale.t('Undecided (will prompt)')}</option><option value={-1}>{locale.t('Disabled')}</option>
                        </select>{/if}
                    </div>
                    <div class="form-group"><label for="settings-upgrades">{locale.t('Automatic upgrades')}</label>
                        {#if options.upgrade}<select id="settings-upgrades" class="form-control" bind:value={mode}>{#if !snapshot.version.isCandidate}<option value="none">{locale.t('No upgrades')}</option>{/if}<option value="stable">{locale.t('Stable releases only')}</option><option value="candidate">{locale.t('Stable releases and release candidates')}</option></select>
                        {:else}<p>{locale.t('Unavailable/Disabled by administrator or maintainer')}</p>{/if}
                    </div>
                    <p><strong>{locale.t('Default Configuration')}</strong></p><div class="folder-actions"><button type="button" class="btn btn-default" onclick={() => defaults('folder')}>{locale.t('Edit Folder Defaults')}</button><button type="button" class="btn btn-default" onclick={() => defaults('device')}>{locale.t('Edit Device Defaults')}</button></div>
                {/if}
            {/if}
        {/if}
        </fieldset>
    </form>
    {#snippet footer()}<button class="btn btn-primary btn-sm" disabled={busy} onclick={save}>{locale.t('Save')}</button><button class="btn btn-default btn-sm" disabled={busy} onclick={close}>{locale.t('Close')}</button>{/snippet}
</Dialog>
{#if nested}<Editor action={nested} state={snapshot} {api} {session} onSaved={(value, lines) => { draft = setValue(draft, 'defaults.' + (nested.folder ? 'folder' : 'device'), value); if (nested.folder) draft = setValue(draft, 'defaults.ignores.lines', lines); }} onClose={() => { nested = null; }} />{/if}
{#if report}<Dialog title="Anonymous Usage Reporting" large onClose={() => { report = null; }}><pre>{JSON.stringify(report, null, 2)}</pre></Dialog>{/if}
{#if discard}<Dialog title="Discard Changes" onClose={() => { discard = false; }}><p>{locale.t('Discard unsaved changes?')}</p>{#snippet footer()}<button class="btn btn-warning" onclick={onClose}>{locale.t('Discard Changes')}</button><button class="btn btn-default" onclick={() => { discard = false; }}>{locale.t('Cancel')}</button>{/snippet}</Dialog>{/if}
