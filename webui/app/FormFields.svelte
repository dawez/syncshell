<script>
    import {getContext} from 'svelte';
    import {getValue, inputValue, changedValue} from '../client/edit.mjs';
    let {draft, fields, onChange} = $props();
    const locale = getContext('locale');
</script>
{#each fields as field (field.path)}
    <div class="form-group">
        {#if field.type === 'checkbox'}<label><input type="checkbox" checked={!!getValue(draft, field.path)} onchange={event => onChange(field.path, event.currentTarget.checked)}> {locale.t(field.label)}</label>
        {:else}<label for={'config-' + field.path}>{locale.t(field.label)}</label>
            {#if field.type === 'select'}<select id={'config-' + field.path} class="form-control" value={inputValue(draft, field)} onchange={event => onChange(field.path, event.currentTarget.value)}>
                {#each field.options as [value, label]}<option {value}>{locale.t(label)}</option>{/each}
            </select>
            {:else if field.type === 'lines'}<textarea id={'config-' + field.path} class="form-control" rows="6" value={(getValue(draft, field.path) || []).join('\n')} oninput={event => onChange(field.path, event.currentTarget.value.split('\n'))}></textarea>
            {:else}<input id={'config-' + field.path} class="form-control" type={field.type === 'list' ? 'text' : field.type} step="any" min={field.min} required={field.required} value={inputValue(draft, field)} oninput={event => onChange(field.path, changedValue(field, event.currentTarget))}>{/if}
        {/if}
    </div>
{/each}
