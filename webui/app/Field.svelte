<script>
    import {getContext} from 'svelte';
    import {fieldHelp} from '../client/field-help.mjs';
    import {unitPrefixed} from '../client/format.mjs';
    import Tooltip from './Tooltip.svelte';
    let {label, rowClass = '', icon = '', help = '', totalBytes, children} = $props();
    const locale = getContext('locale');
    const field = $derived({icon: icon || fieldHelp[label]?.icon || 'fa fa-info-circle',
        help: help || fieldHelp[label]?.help || ''});
</script>

{#snippet explanation()}{locale.t(field.help)}<br>{locale.t('Total')}: ~{unitPrefixed(totalBytes, true)}B{/snippet}
<tr class={rowClass}>
    <th><Tooltip icon={field.icon} {label} text={field.help} children={totalBytes === undefined ? undefined : explanation} />&nbsp;<span>{locale.t(label)}</span></th>
    <td class="text-right">{@render children()}</td>
</tr>
