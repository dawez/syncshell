import {createApi} from '../client/api.mjs';
import {listConflicts, recheckConflicts, replaceDirectory, parentPath, missingHelp, hostActionHelp} from '../client/conflicts.mjs';
import {conflictTranslator} from '../client/conflict-words.mjs';
import '../client/conflicts.css';
import './overview.css';

const api = createApi();
const state = {groups: [], folders: [], search: '', selected: new Map(), loading: false, errors: []};
let t = value => value;
const host = () => window.syncshellHostActions;
const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
};
const icon = name => {
    const node = el('span', 'fas fa-fw fa-' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
};
function button(label, symbol, action) {
    const node = el('button', 'btn btn-default btn-sm'); node.type = 'button';
    const contents = el('span');
    if (symbol) contents.append(icon(symbol), document.createTextNode(' '));
    contents.append(document.createTextNode(t(label))); node.append(contents);
    if (symbol !== 'refresh') node.addEventListener('click', action);
    else {
        node.classList.add('review-scan-button'); node.setAttribute('aria-busy', 'false');
        node.addEventListener('click', async () => {
            if (state.loading) return;
            document.querySelectorAll('.review-scan-button').forEach(button => { button.disabled = true; });
            node.setAttribute('aria-busy', 'true'); contents.classList.add('text-warning', 'review-rechecking');
            contents.querySelector('.fas').classList.add('fa-spin');
            try { await action(); }
            finally {
                node.setAttribute('aria-busy', 'false'); contents.className = '';
                contents.querySelector('.fas').classList.remove('fa-spin');
                document.querySelectorAll('.review-scan-button').forEach(button => { button.disabled = false; });
            }
        });
    }
    return node;
}
function message(text, error = false) {
    const node = document.querySelector('.review-message');
    node.textContent = text; node.classList.toggle('text-danger', error);
    node.setAttribute('role', error ? 'alert' : 'status');
}
async function open(group, file) {
    try { await host().open(group, file); } catch (error) { message(error.message, true); }
}
function fileLink(group, file) {
    if (!file) {
        const node = el('span', 'text-warning', t('Missing current file'));
        const help = icon('exclamation-triangle'); help.tabIndex = 0; help.removeAttribute('aria-hidden');
        help.classList.add('review-missing-help'); help.setAttribute('aria-label', t('Missing current file'));
        $(help).tooltip({container: 'body', placement: 'auto top', delay: {show: 400, hide: 0}, title: t(missingHelp),
            template: '<div class="tooltip review-missing-tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'});
        node.prepend(help); return node;
    }
    if (!file.available) return el('span', 'text-warning', file.name + ' · ' + t('Not available locally'));
    const node = el(host() ? 'a' : 'span', 'review-file'); node.title = group.root + '/' + file.path;
    node.append(icon('file'), el('span', 'review-filename', file.name));
    if (host()) { node.href = '#open-file'; node.addEventListener('click', event => { event.preventDefault(); open(group, file); }); }
    return node;
}
function metadata(file) {
    const size = file.bytes < 1024 ? file.bytes + ' B' : Math.floor(file.bytes / 102.4) / 10 + ' KiB';
    return el('small', 'review-file-meta', size + ' · ' + new Date(file.modified).toLocaleString());
}
function confirmation(group, file) {
    const dialog = el('dialog', 'panel panel-default review-confirm');
    dialog.setAttribute('aria-label', t('Restore original name'));
    const head = el('div', 'panel-heading'); head.append(el('h4', 'panel-title', t('Restore original name')));
    const body = el('div', 'panel-body');
    body.append(el('p', '', t('Rename the selected conflict file to the original name. Other conflict files remain. An existing file will never be overwritten.')));
    for (const [label, path] of [['From', file.path], ['To', group.path]]) body.append(el('strong', '', t(label) + ':'), el('p', 'review-confirm-path', group.root + '/' + path));
    const error = el('p', 'text-danger'); error.setAttribute('role', 'alert'); body.append(error);
    const footer = el('div', 'panel-footer review-confirm-actions');
    const cancel = button('Cancel', null, () => dialog.close());
    const apply = button('Rename', null, async () => {
        apply.disabled = cancel.disabled = true;
        try { await host().rename(group, file); await load(true, group); dialog.close(); }
        catch (value) { error.textContent = value.message; apply.disabled = cancel.disabled = false; }
    });
    apply.firstChild.className = 'text-warning';
    dialog.addEventListener('cancel', event => { if (apply.disabled) event.preventDefault(); });
    dialog.addEventListener('close', () => dialog.remove());
    footer.append(cancel, apply); dialog.append(head, body, footer); document.body.append(dialog); dialog.showModal();
}
function row(group) {
    const tr = el('tr', 'review-row');
    const context = el('td', 'review-context'), location = el('span', 'review-path', group.folderName + (parentPath(group.path) ? ' / ' + parentPath(group.path) : ''));
    location.title = group.root + '/' + parentPath(group.path); context.append(location);
    const current = el('td', 'review-current'); current.append(el('span', 'review-cell-label', t('Current file')), fileLink(group, group.current));
    if (group.current) current.append(metadata(group.current));
    else {
        const hint = el('small', 'review-file-meta review-missing-hint', t('To keep a conflict file, rename it to:') + ' ');
        const name = el('span', 'review-filename', group.name); name.title = group.root + '/' + group.path;
        hint.append(name); current.append(hint);
    }
    const copies = el('td', 'review-copies');
    function selectCopy() {
        copies.replaceChildren();
        const file = group.copies.find(copy => copy.path === state.selected.get(group.id)) || group.copies[0];
        if (group.copies.length > 1) {
            const select = el('select', 'form-control input-sm review-version');
            select.setAttribute('aria-label', t('Conflict files') + ': ' + group.name); select.title = file.name;
            group.copies.forEach((copy, index) => { const option = el('option', '', `${index + 1}/${group.copies.length} · ${copy.name}`); option.value = copy.path; select.append(option); });
            select.value = file.path;
            select.addEventListener('change', () => { state.selected.set(group.id, select.value); selectCopy(); });
            copies.append(select);
        } else copies.append(el('span', 'review-mobile-label', t('Conflict files')));
        copies.append(fileLink(group, file));
        const meta = metadata(file); meta.classList.add('review-conflict-meta');
        if (!group.current && file.available) {
            const resolve = button('Autoresolve', null, () => confirmation(group, file)); resolve.classList.add('review-autoresolve');
            resolve.disabled = !host(); if (!host()) resolve.title = t(hostActionHelp);
            resolve.firstChild.className = 'text-warning'; meta.append(resolve);
        }
        copies.append(meta);
    }
    selectCopy();
    const actions = el('td', 'review-actions');
    const reveal = button('Open folder', 'folder-open', () => open(group)); reveal.disabled = !host();
    if (!host()) reveal.title = t(hostActionHelp);
    actions.append(reveal, button('Recheck files in folder', 'refresh', () => load(true, group)));
    tr.append(context, current, copies, actions); return tr;
}
function renderRows() {
    const panel = document.querySelector('.conflict-review');
    $(panel).find('.review-missing-help').tooltip('destroy');
    const query = state.search.toLocaleLowerCase();
    const groups = state.groups.filter(group => [group.folderName, group.path, ...group.copies.map(file => file.path)].some(value => value.toLocaleLowerCase().includes(query)));
    panel.querySelector('tbody').replaceChildren(...groups.map(row));
    panel.querySelector('.review-empty').textContent = groups.length || state.errors.length ? '' : t(state.groups.length ? 'No matches' : 'No conflict files remain');
}
function mount() {
    const panel = document.querySelector('.conflict-review');
    $(panel).find('.review-missing-help').tooltip('destroy'); panel.replaceChildren();
    panel.append(el('h3', '', t('Review in your file manager')));
    const tools = el('div', 'review-tools'), search = el('input', 'form-control input-sm review-search');
    search.type = 'search'; search.placeholder = t('Search filenames or paths'); search.setAttribute('aria-label', search.placeholder); search.value = state.search;
    search.addEventListener('input', () => { state.search = search.value; renderRows(); });
    const recheck = button('Recheck all files', 'refresh', () => load(true)); recheck.classList.add('review-recheck');
    tools.append(search, recheck); panel.append(tools, el('p', 'review-message'));
    const table = el('table', 'table table-striped review-table review-design-03'); table.setAttribute('aria-label', t('Conflict files'));
    const head = el('thead'), line = el('tr', 'review-column-headings');
    for (const title of ['Location', 'Current file', 'Conflict files', 'Actions']) { const cell = el('th', '', t(title)); cell.scope = 'col'; line.append(cell); }
    head.append(line); table.append(head, el('tbody')); panel.append(table, el('p', 'review-empty text-success'));
}
async function load(scan = false, group = null) {
    if (state.loading) return;
    state.loading = true; state.errors = []; message(t('Loading data...'));
    document.querySelector('.review-empty').textContent = '';
    try {
        state.folders = await api.get('config/folders');
        const data = scan ? await recheckConflicts(api, state.folders, group) : await listConflicts(api, state.folders);
        state.groups = group ? replaceDirectory(state.groups, group, data.groups) : data.groups; state.errors = data.errors;
        renderRows(); message(data.errors.length ? data.errors.join('\n') : scan ? t('Syncthing scan finished; file list updated.') : '', !!data.errors.length);
    } catch (error) { state.errors = [error.message]; message(error.message, true); }
    finally { state.loading = false; }
}
angular.element(document).ready(() => {
    if (!window.metadata?.authenticated) return;
    const injector = angular.element(document.documentElement).injector(), translate = injector.get('$translate');
    const updateLanguage = () => { t = conflictTranslator({language: translate.use() || 'en', t: value => translate.instant(value)}); mount(); renderRows(); };
    updateLanguage();
    injector.get('$rootScope').$on('$translateChangeSuccess', updateLanguage);
    $('#conflicts-tab').on('shown.bs.tab', () => load());
});
