<script>
    import {getContext, onMount} from 'svelte';
    import {createApi} from '../client/api.mjs';
    const locale = getContext('locale');
    let username = $state('');
    let password = $state('');
    let stayLoggedIn = $state(false);
    let busy = $state(false);
    let error = $state('');
    let userInput;
    onMount(() => { userInput.focus(); });
    async function login(event) {
        event.preventDefault();
        busy = true;
        error = '';
        try {
            await createApi().post('noauth/auth/password', {username: username.trim(), password, stayLoggedIn});
            location.reload();
        } catch (failure) {
            error = failure.status === 403 ? 'Incorrect user name or password.' : 'Login failed, see Syncthing logs for details.';
        } finally { busy = false; }
    }
</script>

<div class="center-block">
    <h3>{locale.t('Authentication Required')}</h3>
    <form onsubmit={login}>
        <div class="form-group"><label for="user">{locale.t('User')}</label>
            <input id="user" name="user" class="form-control" autocomplete="username"
                bind:this={userInput} bind:value={username} required></div>
        <div class="form-group"><label for="password">{locale.t('Password')}</label>
            <input id="password" name="password" class="form-control" type="password"
                autocomplete="current-password" bind:value={password}></div>
        <div class="form-group"><label><input id="stayLoggedIn" type="checkbox"
            bind:checked={stayLoggedIn}> {locale.t('Stay logged in')}</label></div>
        <div class="row">
            <div class="col-md-9 login-form-messages">
                {#if error}<p class="text-danger" role="alert">{locale.t(error)}</p>{/if}
            </div>
            <div class="col-md-3 text-right"><button id="submit" class="btn btn-default"
                type="submit" disabled={busy}>{locale.t('Log In')}</button></div>
        </div>
    </form>
</div>
