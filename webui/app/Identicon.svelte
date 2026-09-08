<script>
    import {identiconRects} from '../client/devices.mjs';
    let {id} = $props();
</script>
<span class="panel-icon"><svg class="identicon" viewBox="0 0 5 5" aria-hidden="true">
    {#each identiconRects(id) as [x, y]}<rect {x} {y} width="1" height="1" />{/each}
</svg></span>
