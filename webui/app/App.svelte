<script>
    import {onMount, setContext} from 'svelte';
    import {createApi} from '../client/api.mjs';
    import {createSession, initialState} from '../client/session.mjs';
    import {createLocale, translator} from '../client/locale.mjs';
    import {grouped, deviceName} from '../client/devices.mjs';
    import UsageReport from './UsageReport.svelte';
    import {needsUsageConsent} from '../client/reports.mjs';
    import {notices} from '../client/notices.mjs';
    import Folder from './Folder.svelte';
    import Device from './Device.svelte';
    import Login from './Login.svelte';
    import LanguageMenu from './LanguageMenu.svelte';
    import Notifications from './Notifications.svelte';
    import ActionDialog from './ActionDialog.svelte';
    import Conflicts from './Conflicts.svelte';
    let state = $state(initialState());
    const api = createApi();
    const languages = createLocale(api);
    const session = createSession(api, {publish: value => { state = value; }, onAuthExpired: () => location.reload()});
    let languageVersion = 0;
    const locale = $state({language: 'en', t: translator({}), select: selectLanguage});
    setContext('locale', locale);
    let activeTab = $state('overview'), menu = $state(''), action = $state(null), metric = $state(false);
    const tabs = [['overview', 'Overview'], ['conflicts', 'Resolve sync conflicts'], ['notifications', 'Notifications']];
    const authenticated = Boolean(window.metadata?.authenticated);
    const self = $derived(state.config.devices.find(device => device.deviceID === state.system.myID));
    const others = $derived(state.config.devices.filter(device => device.deviceID !== state.system.myID));
    const folderGroups = $derived(grouped(state.config.folders, 'label', 'id'));
    const deviceGroups = $derived(grouped(others, 'name', 'deviceID'));
    const cards = $derived(notices(state));
    const name = $derived(deviceName(self) || 'Syncthing');
    async function selectLanguage(code) {
        const version = ++languageVersion;
        const selected = await (code ? languages.use(code, true) : languages.auto());
        if (version !== languageVersion) return;
        Object.assign(locale, selected); document.documentElement.lang = selected.language;
    }
    function toggleUnits() {
        metric = !metric;
        try { localStorage.setItem('metricRates', String(metric)); } catch {}
    }
    const perform = promise => promise.catch(() => {});
    async function openAction(next) {
        menu = '';
        try {
            if (next.type === 'add-device') {
                const device = await api.get('config/defaults/device');
                device.deviceID = typeof next.device === 'string' ? next.device : '';
                device.name = next.pending?.name || '';
                next = {...next, device};
            }
            if (next.type === 'add-folder') {
                const folder = await api.get('config/defaults/folder');
                const random = typeof next.folder === 'string' ? null : (await api.get('svc/random/string', {length: 10})).random;
                folder.id = typeof next.folder === 'string' ? next.folder : (random.slice(0, 5) + '-' + random.slice(5)).toLowerCase();
                folder.label = next.pending?.label || '';
                folder.devices = [{deviceID: state.system.myID}, ...(next.device ? [{deviceID: next.device}] : [])];
                if (next.pending?.receiveEncrypted) folder.type = 'receiveencrypted';
                next = {...next, folder};
            }
            if (next.type === 'changes') await session.refreshGlobalChanges();
            action = next;
        } catch (error) { session.reportError(error); }
    }
    function tabKey(event) {
        let index = tabs.findIndex(([id]) => id === activeTab);
        if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else return;
        event.preventDefault(); activeTab = tabs[index][0];
        event.currentTarget.querySelectorAll('[role="tab"]')[index].focus();
    }
    onMount(() => {
        selectLanguage().catch(error => session.reportError(error));
        try { metric = localStorage.getItem('metricRates') === 'true'; } catch {}
        function outside(event) { if (!event.target.closest('.action-menu')) menu = ''; }
        document.addEventListener('pointerdown', outside);
        if (authenticated) session.start();
        return () => { session.stop(); document.removeEventListener('pointerdown', outside); };
    });
</script>
<svelte:head><title>{name} | Syncshell (Svelte)</title></svelte:head>
<nav class="navbar navbar-top navbar-default" aria-label="Main"><div class="container">
    <span class="navbar-brand"><img class="logo" src="assets/img/logo-horizontal.svg" height="32" width="117" alt="Syncthing"></span>
    {#if authenticated}<p class="navbar-text hidden-xs">{name}</p>{/if}
    <ul class="nav navbar-nav navbar-right"><LanguageMenu />
        <li class="dropdown action-menu" class:open={menu === 'help'}><a href="#help" class="dropdown-toggle" aria-expanded={menu === 'help'} onclick={event => { event.preventDefault(); menu = menu === 'help' ? '' : 'help'; }}><span class="fa fa-question-circle"></span> {locale.t('Help')} <span class="caret"></span></a>
            <ul class="dropdown-menu">
                {#each [['Introduction','https://github.com/omarchy-QOL/syncshell#readme'], ['Home page','https://github.com/omarchy-QOL/syncshell'], ['Documentation','https://docs.syncthing.net/'], ['Support','https://github.com/omarchy-QOL/syncshell/issues'], ['Changelog','https://github.com/omarchy-QOL/syncshell/blob/main/CHANGELOG.md'], ['Statistics','https://data.syncthing.net/'], ['Bugs','https://github.com/omarchy-QOL/syncshell/issues'], ['Source Code','https://github.com/omarchy-QOL/syncshell']] as [label, url]}
                    <li><a href={url} target="_blank" rel="noreferrer">{locale.t(label)}</a></li>
                {/each}
                <li><a href="#about" onclick={event => { event.preventDefault(); openAction({type: 'about'}); }}>{locale.t('About')}</a></li>
            </ul>
        </li>
        {#if authenticated}<li class="dropdown action-menu" class:open={menu === 'actions'}><a href="#actions" class="dropdown-toggle" aria-expanded={menu === 'actions'} onclick={event => { event.preventDefault(); menu = menu === 'actions' ? '' : 'actions'; }}><span class="fas fa-cog"></span> {locale.t('Actions')} <span class="caret"></span></a>
            <ul class="dropdown-menu">
                <li><a href="#settings" onclick={event => { event.preventDefault(); openAction({type: 'settings'}); }}>{locale.t('Settings')}</a></li>
                <li><a href="#advanced" onclick={event => { event.preventDefault(); openAction({type: 'advanced'}); }}>{locale.t('Advanced')}</a></li>
                <li><a href="#identification" onclick={event => { event.preventDefault(); openAction({type: 'identification', device: self}); }}>{locale.t('Show ID')}</a></li>
                <li><a href="#logs" onclick={event => { event.preventDefault(); openAction({type: 'logs'}); }}>{locale.t('Logs')}</a></li>
                {#if state.upgradeInfo?.newer || state.upgradeInfo?.majorNewer}<li><a href="#upgrade" onclick={event => { event.preventDefault(); openAction({type: 'upgrade'}); }}>{locale.t('Upgrade')} {state.upgradeInfo.latest}</a></li>{/if}
                <li><a href="rest/debug/support" target="_blank">{locale.t('Support Bundle')}</a></li>
                {#if state.config.gui?.user || state.config.gui?.authMode === 'ldap'}<li><a href="#logout" onclick={async event => { event.preventDefault(); await api.post('noauth/auth/logout', {}); location.reload(); }}>{locale.t('Log Out')}</a></li>{/if}
                <li><a href="#restart" onclick={event => { event.preventDefault(); openAction({type: 'restart'}); }}>{locale.t('Restart')}</a></li>
                <li><a href="#shutdown" onclick={event => { event.preventDefault(); openAction({type: 'shutdown'}); }}>{locale.t('Shut Down')}</a></li>
            </ul>
        </li>{/if}
    </ul>
</div></nav>
<main class="container content">
    {#if !authenticated}<Login />{:else}
        {#if state.error && !['restart', 'shutdown', 'upgrade'].includes(action?.type)}<div class="alert alert-danger" role="alert">{state.error.message}</div>{/if}
        {#if !state.configInSync}<div class="alert alert-warning">{locale.t('Restart Needed')} <button class="btn btn-default btn-sm" onclick={() => openAction({type: 'restart'})}>{locale.t('Restart')}</button></div>{/if}
        {#if !state.ready}<p role="status">{locale.t('Loading data...')}</p>{/if}
        <div class="dashboard">
            <ul class="nav nav-tabs dashboard-tabs" role="tablist" onkeydown={tabKey}>
                {#each tabs as [id, label]}<li class:active={id === activeTab} role="presentation"><a id={id + '-tab'} href={'#dashboard-' + id} role="tab" aria-controls={'dashboard-' + id} aria-selected={id === activeTab} tabindex={id === activeTab ? 0 : -1} onclick={event => { event.preventDefault(); activeTab = id; }}>{locale.t(label)}
                    {#if id === 'notifications'}<span class="notification-indicator"><span class="fas fa-circle text-success" role="img" aria-label={locale.t('Pending notifications')}></span><span class="fas fa-circle text-warning" role="img" aria-label={locale.t('Pending warnings')}></span><span class="fas fa-circle text-danger" role="img" aria-label={locale.t('Pending errors')}></span></span>{/if}
                </a></li>{/each}
            </ul>
            <div class="tab-content">
                <div id="dashboard-overview" class="tab-pane dashboard-primary" class:active={activeTab === 'overview'} role="tabpanel" aria-labelledby="overview-tab">
                    <section class="dashboard-folders" aria-labelledby="folder-list"><h3 id="folder-list">{locale.t('Folders')}{state.config.folders.length > 1 ? ' (' + state.config.folders.length + ')' : ''}</h3>
                        {#each folderGroups as [group, folders]}<div>{#if group}<h4 class="folder-text" title={group}>{group}{folders.length > 1 ? ' (' + folders.length + ')' : ''}</h4>{/if}
                            <div class="panel-group">{#each folders as folder (folder.id)}<Folder {api} {session} {state} {folder} progress={state.scanProgress[folder.id]} info={state.model[folder.id]} stats={state.folderStats[folder.id]} rescan={() => session.rescan(folder.id)} onAction={openAction} />{/each}</div>
                        </div>{/each}
                        <div class="folder-actions">
                            {#if state.config.folders.some(folder => !folder.paused)}<button class="btn btn-sm btn-default" onclick={() => perform(session.setPaused('folders', undefined, true))}><span class="fas fa-pause"></span> {locale.t('Pause All')}</button>{/if}
                            {#if state.config.folders.some(folder => folder.paused)}<button class="btn btn-sm btn-default" onclick={() => perform(session.setPaused('folders', undefined, false))}><span class="fas fa-play"></span> {locale.t('Resume All')}</button>{/if}
                            {#if state.config.folders.length}<button class="btn btn-sm btn-default" onclick={() => perform(session.rescan())}><span class="fas fa-refresh"></span> {locale.t('Rescan All')}</button>{/if}
                            <button class="btn btn-sm btn-default" onclick={() => openAction({type: 'add-folder'})}><span class="fas fa-plus"></span> {locale.t('Add Folder')}</button>
                        </div>
                    </section>
                    <section class="dashboard-devices" aria-label={locale.t('Devices')}><h3>{locale.t('Devices')}</h3>
                        {#if self}<Device device={self} {state} {session} local {metric} {toggleUnits} onAction={openAction} />{/if}
                        <div class="dashboard-remotes">{#each deviceGroups as [group, devices]}<div>{#if group}<h4>{group}{devices.length > 1 ? ' (' + devices.length + ')' : ''}</h4>{/if}<div class="panel-group">{#each devices as device (device.deviceID)}<Device {device} {state} {session} {metric} {toggleUnits} onAction={openAction} />{/each}</div></div>{/each}
                            <div class="folder-actions">
                                {#if others.some(device => !device.paused)}<button class="btn btn-sm btn-default" onclick={() => perform(session.setPaused('devices', undefined, true))}>{locale.t('Pause All')}</button>{/if}
                                {#if others.some(device => device.paused)}<button class="btn btn-sm btn-default" onclick={() => perform(session.setPaused('devices', undefined, false))}>{locale.t('Resume All')}</button>{/if}
                                <button class="btn btn-sm btn-default" onclick={() => openAction({type: 'changes'})}>{locale.t('Recent Changes')}</button>
                                <button class="btn btn-sm btn-default" onclick={() => openAction({type: 'add-device'})}>{locale.t('Add Remote Device')}</button>
                            </div>
                        </div>
                    </section>
                </div>
                <div id="dashboard-conflicts" class="tab-pane" class:active={activeTab === 'conflicts'} role="tabpanel" tabindex="0" aria-labelledby="conflicts-tab"><Conflicts {api} folders={state.config.folders} ready={state.ready} active={activeTab === 'conflicts'} /></div>
                <div id="dashboard-notifications" class="tab-pane notifications" class:active={activeTab === 'notifications'} role="tabpanel" tabindex="0" aria-labelledby="notifications-tab"><Notifications {cards} {session} onAction={openAction} /></div>
            </div>
        </div>
    {/if}
</main>
{#if action}{#key action}<ActionDialog {action} {state} {api} {session} onClose={() => { action = null; }} />{/key}{/if}

{#if needsUsageConsent(state)}<UsageReport {api} {session} {state} consent onClose={() => {}} />{/if}
