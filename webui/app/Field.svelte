<script>
    import {getContext} from 'svelte';
    import {fieldHelp} from '../client/field-help.mjs';
    import Tooltip from './Tooltip.svelte';
    let {label, rowClass = '', children} = $props();
    const locale = getContext('locale');
    const field = $derived(fieldHelp[label]);
</script>

<tr class={rowClass}>
    <th><Tooltip icon={field.icon} {label} text={field.help} />&nbsp;<span>{locale.t(label)}</span></th>
    <td class="text-right">{@render children()}</td>
</tr>
