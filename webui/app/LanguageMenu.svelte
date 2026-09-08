<script>
    import {getContext, onMount} from 'svelte';
    const locale = getContext('locale');
    const entries = window.validLangs.map(code => [code, window.langPrettyprint[code] || `[${code}]`])
        .sort((a, b) => a[1].localeCompare(b[1]));
    let open = $state(false);
    let root;
    onMount(() => {
        function outside(event) { if (!root.contains(event.target)) open = false; }
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    });
    function key(event) {
        if (event.key === 'Escape') { open = false; root.querySelector('a').focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open = true;
            const items = [...root.querySelectorAll('.dropdown-menu a')];
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const index = items.indexOf(document.activeElement);
            requestAnimationFrame(() => items[Math.max(0, Math.min(items.length - 1, index + step))]?.focus());
        }
    }
</script>

<li bind:this={root} class:open class="dropdown" >
    <a href="#language" class="dropdown-toggle" aria-label="Language" onkeydown={key} aria-expanded={open} aria-haspopup="true"
        onclick={event => { event.preventDefault(); open = !open; }}>
        <span class="fas fa-globe"></span><span class="hidden-xs">&nbsp;{window.langPrettyprint[locale.language] || 'English'}</span> <span class="caret"></span>
    </a>
    <ul class="dropdown-menu">
        {#each entries as [code, name]}
            <li class:active={code === locale.language}><a href="#language" onkeydown={key}
                onclick={event => { event.preventDefault(); locale.select(code); open = false; }}>{name}</a></li>
        {/each}
    </ul>
</li>
