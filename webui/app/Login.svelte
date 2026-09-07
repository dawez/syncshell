<script>
    import {createApi} from '../client/api.mjs';
    let username = $state('');
    let password = $state('');
    let stayLoggedIn = $state(false);
    let busy = $state(false);
    let error = $state('');
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

<form class="panel panel-default" onsubmit={login}>
    <div class="panel-heading"><h3 class="panel-title">Log In</h3></div>
    <div class="panel-body">
        {#if error}<p class="text-danger" role="alert">{error}</p>{/if}
        <div class="form-group"><label for="username">Username</label>
            <input id="username" class="form-control" autocomplete="username" bind:value={username}></div>
        <div class="form-group"><label for="password">Password</label>
            <input id="password" class="form-control" type="password" autocomplete="current-password" bind:value={password}></div>
        <label><input type="checkbox" bind:checked={stayLoggedIn}> Stay logged in</label>
    </div>
    <div class="panel-footer"><button class="btn btn-primary" type="submit" disabled={busy}>Log In</button></div>
</form>
