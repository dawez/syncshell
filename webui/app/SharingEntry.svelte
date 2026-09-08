<script>
    import {getContext} from 'svelte';
    import ShareStatus from './ShareStatus.svelte';
    let {label, id, selected, password = '', encrypted = false, required = false, remoteState = '', onSelected, onPassword} = $props();
    const locale = getContext('locale');
    let plain = $state(false);
</script>
<div class="form-group">
    <label title={id}><input type="checkbox" checked={selected} onchange={event => onSelected(event.currentTarget.checked)}> {label}</label>
    <ShareStatus {remoteState} />
    <div class="input-group">
        <span class="input-group-addon"><span aria-hidden="true" class="fas fa-{encrypted || password ? 'lock' : 'unlock'}"></span></span>
        <input class="form-control" type={plain ? 'text' : 'password'} aria-label={locale.t('Encryption Password') + ': ' + label} autocomplete="off" value={password} disabled={encrypted || !selected} required={selected && !encrypted && required} placeholder={locale.t(encrypted ? 'Received data is already encrypted' : !selected ? 'Not shared' : required ? 'Device is untrusted, enter encryption password' : 'If untrusted, enter encryption password')} oninput={event => onPassword(event.currentTarget.value)}>
        <span class="input-group-btn"><button type="button" class="btn btn-default" disabled={encrypted || !selected} aria-label={locale.t(plain ? 'Hide password' : 'Show password')} onclick={() => { plain = !plain; }}><span aria-hidden="true" class="fas fa-{plain ? 'eye-slash' : 'eye'}"></span></button></span>
    </div>
</div>
