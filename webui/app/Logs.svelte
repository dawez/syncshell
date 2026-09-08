<script>
    import {getContext, onMount, tick} from 'svelte';
    import Dialog from './Dialog.svelte';
    let {api, onClose} = $props();
    const locale = getContext('locale');
    let tab = $state('Log'), entries = $state([]), facilities = $state({levels: {}, packages: {}});
    let error = $state(''), busy = $state(false), paused = $state(false), area = $state();
    const content = $derived(entries.map(entry => entry.when.split('.')[0].replace('T', ' ') + ' ' + (entry.level || '') + ' ' + entry.message).join('\n'));
    onMount(() => {
        const controller = new AbortController(); let timer;
        api.get('system/loglevels', undefined, controller.signal).then(value => { facilities = value; })
            .catch(value => { if (!controller.signal.aborted) error = value.message; });
        async function poll() {
            try {
                if (!paused) {
                    const data = await api.get('system/log', {since: entries.at(-1)?.when}, controller.signal);
                    if (!paused && !controller.signal.aborted) { entries = [...entries, ...(data.messages || [])]; error = ''; await tick(); if (area) area.scrollTop = area.scrollHeight; }
                }
            } catch (value) { if (!controller.signal.aborted) error = value.message; }
            finally { if (!controller.signal.aborted) timer = setTimeout(poll, 2000); }
        }
        poll(); return () => { controller.abort(); clearTimeout(timer); };
    });
    async function level(key, value) {
        busy = true;
        try { await api.post('system/loglevels', {...facilities.levels, [key]: value}); facilities = await api.get('system/loglevels'); error = ''; }
        catch (value) { error = value.message; }
        finally { busy = false; }
    }
</script>
<Dialog title="Logs" large icon="fa fa-wrench" {onClose}>
    <ul class="nav nav-tabs">{#each ['Log', 'Debugging Facilities'] as name}<li class:active={tab === name}><a href="#logs-{name}" onclick={event => { event.preventDefault(); tab = name; }}>{locale.t(name)}</a></li>{/each}</ul>
    {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
    {#if tab === 'Log'}<textarea bind:this={area} class="form-control text-monospace" aria-label={locale.t('Log')} rows="20" readonly value={content} onscroll={() => { paused = area.scrollHeight > area.scrollTop + area.clientHeight + 1; }}></textarea>
        {#if paused}<button class="btn btn-link" onclick={() => { paused = false; area.scrollTop = area.scrollHeight; }}>{locale.t('Log tailing paused. Scroll to the bottom to continue.')}</button>{/if}
    {:else}<p>{locale.t('Available debug logging facilities:')}</p><table class="table table-striped"><tbody>{#each Object.entries(facilities.levels) as [key, value]}<tr><td>{facilities.packages[key]} (<code>{key}</code>)</td><td><select class="form-control" aria-label={key} disabled={busy} value={value} onchange={event => level(key, event.currentTarget.value)}>{#each [['DEBUG','Debug'],['INFO','Info'],['WARN','Warning'],['ERROR','Error']] as [level, label]}<option value={level}>{locale.t(label)}</option>{/each}</select></td></tr>{/each}</tbody></table>{/if}
</Dialog>
