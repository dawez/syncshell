<script>
    import {getContext, onMount} from 'svelte';
    import Dialog from './Dialog.svelte';
    import data from '../client/about-data.json';
    import {aboutPaths} from '../client/about.mjs';
    let {api, version, onClose} = $props();
    const locale = getContext('locale');
    let tab = $state('Authors'), paths = $state({}), error = $state('');
    onMount(() => {
        const controller = new AbortController();
        if (window.metadata?.authenticated) api.get('system/paths', undefined, controller.signal).then(value => { paths = value; })
            .catch(value => { if (!controller.signal.aborted) error = value.message; });
        return () => controller.abort();
    });
</script>
<Dialog title="About" large status="info" icon="far fa-heart" {onClose}>
    <h2 class="text-center"><a href="https://github.com/omarchy-QOL/syncshell" target="_blank" rel="noreferrer">Syncshell</a></h2>
    <p class="text-center">Modern / Omarchy Web UI, based on Syncthing.</p>
    <p class="text-center">Syncthing {version.version || ''} {version.codename || ''}</p>
    {#if version.date}<p class="text-center">Build {version.date.slice(0, 10)} {Array.isArray(version.tags) ? version.tags.join(', ') : ''}</p>{/if}
    {#if !version.version}<p class="text-center">{locale.t('Log in to see version information.')}</p>{/if}
    <p class="text-center">{locale.t('Syncthing is Free and Open Source Software licensed as MPL v2.0.')} <a href="LICENSE.syncthing">MPL 2.0</a></p>
    <ul class="nav nav-tabs">{#each ['Authors', 'Included Software', 'Paths'] as name}<li class:active={tab === name}><a href="#about-{name}" onclick={event => { event.preventDefault(); tab = name; }}>{locale.t(name)}</a></li>{/each}</ul>
    {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
    {#if tab === 'Authors'}<h4>{locale.t('The Syncthing Authors')}</h4><p>{data.authors}</p>
    {:else if tab === 'Included Software'}<p>Svelte · <a href="licenses/svelte.txt">MIT license</a></p><p>{locale.t('Syncthing includes the following software or portions thereof:')}</p><ul class="list-unstyled">{#each data.software as software}<li><a href={software.url} target="_blank" rel="noreferrer">{software.name}</a> · {software.notice}</li>{/each}</ul>
    {:else}<table class="table table-condensed table-striped port-about-paths"><caption>{locale.t('Internally used paths:')}</caption><tbody>{#each aboutPaths as [label, keys]}<tr><th>{locale.t(label)}</th><td>{#each keys as key}<div><code class="word-break-all">{paths[key] || ''}</code></div>{/each}</td></tr>{/each}</tbody></table>{/if}
</Dialog>
