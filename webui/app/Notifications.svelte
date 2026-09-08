<script>
    import {getContext} from 'svelte';
    import {noticeAction} from '../client/notices.mjs';
    import {timestamp} from '../client/format.mjs';
    import Identicon from './Identicon.svelte';
    let {cards, session, onAction} = $props();
    const locale = getContext('locale');
    const color = action => ['Ignore', 'Disable Crash Reporting'].includes(action) ? 'danger'
        : action === 'Yes' ? 'primary' : ['Add Device', 'Add', 'Share', 'Enable Crash Reporting'].includes(action) ? 'success' : 'default';
    const icon = action => ({Settings: 'fa-cog', Restart: 'fa-refresh', 'Add Device': 'fa-plus',
        Ignore: 'fa-times', Dismiss: 'fa-clock', No: 'fa-times', 'Disable Crash Reporting': 'fa-times'})[action] || 'fa-check';
</script>

<h3>{locale.t('Notifications')}</h3>
{#if !cards.length}<p class="notifications-empty">{locale.t('No pending notifications.')}</p>{/if}
{#each cards as card (card.id)}
    <div class="row"><div class="col-md-12"><div class="panel panel-{card.severity}">
        <div class="panel-heading"><h3 class="panel-title">
            {#if card.kind === 'device'}<Identicon id={card.device} />
            {:else}<span class="panel-icon"><span class="fas {card.kind === 'folder' ? 'fa-folder' : card.severity === 'success' ? 'fa-bolt' : 'fa-exclamation-circle'}"></span></span>{/if}
            {locale.t(card.title)}
            {#if card.time}<span class="pull-right">{timestamp(card.time)}</span>{/if}
        </h3></div>
        <div class="panel-body">
            {#each card.paragraphs || [] as paragraph}<p>{locale.t(paragraph, card.params)}</p>{/each}
            {#each card.errors || [] as error}<p><small>{timestamp(error.when)}:</small> {error.message}</p>{/each}
            {#if card.watchers}<table><tbody>{#each card.watchers as watcher}<tr><td>{watcher.name}: </td><td>{watcher.error}</td></tr>{/each}</tbody></table>{/if}
            {#if card.link}<p><a href={card.link} target="_blank" rel="noreferrer"><span class="fas fa-info-circle"></span>&nbsp;{locale.t(card.id === 'watchers' ? 'Support' : 'Learn more')}</a></p>{/if}
        </div>
        {#if card.actions?.length}<div class="panel-footer clearfix">
            {#each card.actions as action}<button class="btn btn-sm btn-{color(action)}"
                onclick={() => noticeAction(session, card, action, onAction).catch(() => {})}>
                <span class="fas {icon(action)}"></span>&nbsp;{locale.t(action)}
            </button>{/each}
        </div>{/if}
    </div></div></div>
{/each}
