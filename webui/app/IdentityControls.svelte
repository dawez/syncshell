<script>
    import {getContext} from 'svelte';
    import Dialog from './Dialog.svelte';
    import {identityMessage} from '../client/identity.mjs';
    let {device, api} = $props();
    const locale = getContext('locale');
    let method = $state(''), validated = $state(null), copied = $state(false), error = $state('');
    const message = $derived(validated ? identityMessage(validated, method, locale.t) : null);
    async function use(action) {
        error = '';
        try {
            const result = await api.get('svc/deviceid', {id: device.deviceID});
            if (result.error) throw new Error(result.error);
            validated = {...device, deviceID: result.id};
            if (action === 'copy') { await navigator.clipboard.writeText(validated.deviceID); copied = true; }
            else method = action;
        } catch (value) { error = value.message; }
    }
    async function copy(text) {
        try { await navigator.clipboard.writeText(text); } catch (value) { error = value.message; }
    }
</script>
<div class="folder-actions">
    <button type="button" class="btn btn-default" disabled={!device.deviceID} onclick={() => use('copy')}><span aria-hidden="true" class="fa fa-clone"></span> {locale.t(copied ? 'Copied!' : 'Copy')}</button>
    <button type="button" class="btn btn-default" disabled={!device.deviceID} onclick={() => use('email')}><span aria-hidden="true" class="fa fa-envelope-o"></span> {locale.t('Share by Email')}</button>
    <button type="button" class="btn btn-default" disabled={!device.deviceID} onclick={() => use('sms')}><span aria-hidden="true" class="fa fa-comments-o"></span> {locale.t('Share by SMS')}</button>
</div>
{#if error}<p class="text-danger" role="alert">{error}</p>{/if}
{#if method && message}
    <Dialog title={method === 'email' ? 'Share by Email' : 'Share by SMS'} large={method === 'email'} icon={method === 'email' ? 'fa fa-envelope-o' : 'fa fa-comments-o'} onClose={() => { method = ''; }}>
        <p>{locale.t('The following text will automatically be inserted into a new message.')} {locale.t(method === 'email' ? 'Your email app should open to let you choose the recipient and send it from your own address.' : 'Your SMS app should open to let you choose the recipient and send it from your own number.')} {locale.t('You can also copy and paste the text into a new message manually.')}</p>
        {#if method === 'email'}<h5>{locale.t('Subject:')}</h5><pre class="port-share-text">{message.subject}</pre><button class="btn btn-default btn-sm" onclick={() => copy(message.subject)}>{locale.t('Copy')}</button><h5>{locale.t('Body:')}</h5>{/if}
        <pre class="port-share-text">{message.body}</pre><button class="btn btn-default btn-sm" onclick={() => copy(message.body)}>{locale.t('Copy')}</button>
        {#snippet footer()}<a class="btn btn-primary" href={message.href}>{locale.t('Share')}</a><button class="btn btn-default" onclick={() => { method = ''; }}>{locale.t('Cancel')}</button>{/snippet}
    </Dialog>
{/if}
