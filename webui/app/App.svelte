<script>
    import {onMount, setContext} from 'svelte';
    import {createApi} from '../client/api.mjs';
    import {createSession, initialState} from '../client/session.mjs';
    import Folder from './Folder.svelte';
    import Login from './Login.svelte';
    import LanguageMenu from './LanguageMenu.svelte';
    import {createLocale, translator} from '../client/locale.mjs';

    let state = $state(initialState());
    let session;
    const api = createApi();
    const languages = createLocale(api);
    let languageVersion = 0;
    const locale = $state({language: 'en', t: translator({}), select: selectLanguage});
    setContext('locale', locale);
    async function selectLanguage(code) {
        const version = ++languageVersion;
        const selected = await (code ? languages.use(code, true) : languages.auto());
        if (version !== languageVersion) return;
        Object.assign(locale, selected);
        document.documentElement.lang = selected.language;
    }
    const authenticated = Boolean(window.metadata?.authenticated);
    const name = $derived(state.config.devices.find(device =>
        device.deviceID === state.system.myID)?.name || state.system.myID || 'Syncthing');

    onMount(() => {
        selectLanguage().catch(error => { state = {...state, error}; });
        if (!authenticated) return;
        session = createSession(api, {publish: value => { state = value; },
            onAuthExpired: () => location.reload()});
        session.start();
        return () => { session.stop(); };
    });
</script>

<nav class="navbar navbar-top navbar-default" aria-label="Main">
    <div class="container">
        <span class="navbar-brand"><img class="logo" src="assets/img/logo-horizontal.svg"
            height="32" width="117" alt="Syncthing"></span>
        <p class="navbar-text">{name}</p>
        <ul class="nav navbar-nav navbar-right"><LanguageMenu /></ul>
    </div>
</nav>
<main class="container content">
    {#if !authenticated}
        <Login />
    {:else}
    {#if state.error}
        <div class="alert alert-danger" role="alert">{state.error.message}</div>
    {/if}
    {#if !state.ready}<p role="status">Connecting to Syncthing…</p>{/if}
    <div class="dashboard">
        <div class="dashboard-primary active">
            <section class="dashboard-folders" aria-labelledby="folder-list">
                <h3 id="folder-list">{locale.t('Folders')}</h3>
                <div class="panel-group">
                    {#each state.config.folders as folder (folder.id)}
                        <Folder {api} {folder} progress={state.scanProgress[folder.id]} info={state.model[folder.id]}
                            stats={state.folderStats[folder.id]}
                            rescan={() => session.rescan(folder.id)} />
                    {/each}
                </div>
            </section>
        </div>
    </div>
    {/if}
</main>
