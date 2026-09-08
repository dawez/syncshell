//#region client/api.mjs
var e = class extends Error {
	constructor(e, t) {
		super(typeof t == "string" && t ? t : t?.error || `HTTP ${e.status}`), this.name = "HttpError", this.status = e.status, this.data = t, this.url = e.url;
	}
};
function t({ pageUrl: t = location.href, metadata: n = window.metadata, fetch: r = globalThis.fetch, cookie: i = () => document.cookie } = {}) {
	let a = new URL("rest/", t), o = n?.deviceIDShort;
	async function s(t, n, { query: s, body: c, signal: l } = {}) {
		let u = new URL(n, a);
		if (u.origin !== a.origin || !u.pathname.startsWith(a.pathname)) throw TypeError("Syncthing requests must stay within the REST base");
		for (let [e, t] of Object.entries(s || {})) t != null && u.searchParams.set(e, t);
		let d = new Headers({ Accept: "application/json, text/plain, */*" });
		if (o) {
			let e = `CSRF-Token-${o}=`, t = i().split(";").map((e) => e.trim()).find((t) => t.startsWith(e));
			t && d.set(`X-CSRF-Token-${o}`, decodeURIComponent(t.slice(e.length)));
		}
		c !== void 0 && d.set("Content-Type", "application/json");
		let f = await r(u, {
			method: t,
			headers: d,
			signal: l,
			credentials: "same-origin",
			body: c === void 0 ? void 0 : JSON.stringify(c)
		}), p = await f.text(), m = p;
		if (p && (f.headers.get("Content-Type")?.includes("json") || /^[\s]*[\[{]/.test(p))) try {
			m = JSON.parse(p);
		} catch (e) {
			if (f.ok) throw e;
		}
		if (!f.ok) throw new e(f, m);
		return m;
	}
	return {
		request: s,
		get: (e, t, n) => s("GET", e, {
			query: t,
			signal: n
		}),
		post: (e, t, n, r) => s("POST", e, {
			body: t,
			query: n,
			signal: r
		}),
		put: (e, t, n) => s("PUT", e, {
			body: t,
			signal: n
		}),
		patch: (e, t, n) => s("PATCH", e, {
			body: t,
			signal: n
		}),
		delete: (e, t, n) => s("DELETE", e, {
			query: t,
			signal: n
		})
	};
}
//#endregion
//#region client/conflicts.mjs
var n = /^(.*)\.sync-conflict-\d{8}-\d{6}-[A-Z2-7]{7}(\..*)?$/, r = (e) => e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "", i = (e) => e.slice(e.lastIndexOf("/") + 1);
function a(e) {
	let t = n.exec(i(e));
	if (!t) return null;
	let a = t[1] + (t[2] || "");
	return n.test(a) ? null : (r(e) ? r(e) + "/" : "") + a;
}
var o = (e) => e?.type === "FILE_INFO_TYPE_FILE" && ![
	"deleted",
	"ignored",
	"invalid",
	"mustRescan"
].some((t) => e[t]);
async function s(e, t, n, r) {
	let a;
	try {
		a = await e.get("db/file", {
			folder: t,
			file: n
		}, r);
	} catch (e) {
		if (e.status === 404) return null;
		throw e;
	}
	if (!o(a.global)) return null;
	let s = o(a.local), c = s ? a.local : a.global;
	return {
		path: n,
		name: i(n),
		bytes: c.size,
		modified: c.modified,
		available: s,
		digest: s ? c.blocksHash ?? null : null
	};
}
function* c(e, t = "") {
	for (let n of e) {
		let e = t ? t + "/" + n.name : n.name;
		n.type === "FILE_INFO_TYPE_DIRECTORY" ? yield* c(n.children || [], e) : n.type === "FILE_INFO_TYPE_FILE" && (yield e);
	}
}
async function l(e, t, { prefix: n = "", signal: r } = {}) {
	let o = await e.get("db/browse", {
		folder: t.id,
		prefix: n
	}, r), l = /* @__PURE__ */ new Map();
	for (let u of c(o, n)) {
		let n = a(u);
		if (!n) continue;
		let o = await s(e, t.id, u, r);
		o && (l.has(n) || l.set(n, {
			id: JSON.stringify([t.id, n]),
			folder: t.id,
			folderName: t.label || t.id,
			root: t.path,
			path: n,
			name: i(n),
			copies: [],
			current: null
		}), l.get(n).copies.push(o));
	}
	for (let n of l.values()) n.current = await s(e, t.id, n.path, r), n.copies.sort((e, t) => t.name.localeCompare(e.name));
	return [...l.values()].sort((e, t) => e.path.localeCompare(t.path));
}
async function u(e, t, n) {
	let r = await Promise.allSettled(t.map((t) => l(e, t, { signal: n })));
	if (n?.aborted) throw n.reason;
	return {
		groups: r.flatMap((e) => e.status === "fulfilled" ? e.value : []),
		errors: r.flatMap((e, n) => e.status === "rejected" ? [(t[n].label || t[n].id) + ": " + e.reason.message] : [])
	};
}
async function d(e, t, n, i) {
	if (await e.post("db/scan", void 0, n ? {
		folder: n.folder,
		sub: r(n.path)
	} : {}, i), !n) return u(e, t, i);
	let a = t.find((e) => e.id === n.folder);
	if (!a) throw Error("Folder is no longer configured");
	return {
		groups: await l(e, a, {
			prefix: r(n.path),
			signal: i
		}),
		errors: []
	};
}
function f(e, t, n) {
	let i = r(t.path);
	return [...e.filter((e) => e.folder !== t.folder || i && !e.path.startsWith(i + "/")), ...n];
}
var p = "The latest Syncthing index has no usable file at the original name. Conflict files are ordinary files with a conflict marker in their names. Rename the version you want to keep, or delete unwanted conflict files, then recheck. Rechecking alone does not rename or delete files.", m = "Opening or renaming local files requires the file-manager integration, which is not connected in this port yet.", h = { de: {
	Location: "Speicherort",
	Actions: "Aktionen",
	"Conflict files": "Konfliktdateien",
	"Current file": "Aktuelle Datei",
	"Conflict copies": "Konfliktkopien",
	"Conflict copy": "Konfliktkopie",
	"Recheck files in folder": "Dateien im Ordner erneut prüfen",
	"Recheck all files": "Alle Dateien erneut prüfen",
	Autoresolve: "Automatisch auflösen",
	"Restore original name": "Ursprünglichen Namen wiederherstellen",
	Rename: "Umbenennen",
	Cancel: "Abbrechen",
	From: "Von",
	To: "Nach",
	"Rename the selected conflict file to the original name. Other conflict files remain. An existing file will never be overwritten.": "Die ausgewählte Konfliktdatei erhält den ursprünglichen Namen. Andere Konfliktdateien bleiben erhalten. Eine vorhandene Datei wird niemals überschrieben.",
	"File renamed; Syncthing status refreshed.": "Datei umbenannt; Syncthing-Status aktualisiert.",
	"Open folder": "Ordner anzeigen",
	"No matches": "Keine Treffer",
	"Search filenames or paths": "Dateinamen oder Pfade suchen",
	"Missing current file": "Aktuelle Datei fehlt",
	"No conflict files remain": "Keine Konfliktdateien mehr vorhanden",
	"To keep a conflict file, rename it to:": "Zum Behalten eine Konfliktdatei umbenennen in:",
	"The latest Syncthing index has no usable file at the original name. Conflict files are ordinary files with a conflict marker in their names. Rename the version you want to keep, or delete unwanted conflict files, then recheck. Rechecking alone does not rename or delete files.": "Im aktuellen Syncthing-Index gibt es keine verwendbare Datei unter dem ursprünglichen Namen. Konfliktdateien sind normale Dateien mit einer Konfliktmarkierung im Namen. Benennen Sie die gewünschte Version um oder löschen Sie unerwünschte Konfliktdateien. Prüfen Sie danach erneut. Die erneute Prüfung benennt keine Dateien um und löscht nichts.",
	"Not available locally": "Lokal nicht verfügbar",
	"Waiting for Syncthing to download this file": "Warten auf den Download durch Syncthing",
	"Open in file manager": "Im Dateimanager anzeigen"
} }, g = (e) => (t) => h[e.language]?.[t] || e.t(t), _ = t(), v = {
	groups: [],
	folders: [],
	search: "",
	selected: /* @__PURE__ */ new Map(),
	loading: !1,
	errors: []
}, y = (e) => e, b = () => window.syncshellHostActions, x = (e, t, n) => {
	let r = document.createElement(e);
	return t && (r.className = t), n !== void 0 && (r.textContent = n), r;
}, S = (e) => {
	let t = x("span", "fas fa-fw fa-" + e);
	return t.setAttribute("aria-hidden", "true"), t;
};
function C(e, t, n) {
	let r = x("button", "btn btn-default btn-sm");
	r.type = "button";
	let i = x("span");
	return t && i.append(S(t), document.createTextNode(" ")), i.append(document.createTextNode(y(e))), r.append(i), t === "refresh" ? (r.classList.add("review-scan-button"), r.setAttribute("aria-busy", "false"), r.addEventListener("click", async () => {
		if (!v.loading) {
			document.querySelectorAll(".review-scan-button").forEach((e) => {
				e.disabled = !0;
			}), r.setAttribute("aria-busy", "true"), i.classList.add("text-warning", "review-rechecking"), i.querySelector(".fas").classList.add("fa-spin");
			try {
				await n();
			} finally {
				r.setAttribute("aria-busy", "false"), i.className = "", i.querySelector(".fas").classList.remove("fa-spin"), document.querySelectorAll(".review-scan-button").forEach((e) => {
					e.disabled = !1;
				});
			}
		}
	})) : r.addEventListener("click", n), r;
}
function w(e, t = !1) {
	let n = document.querySelector(".review-message");
	n.textContent = e, n.classList.toggle("text-danger", t), n.setAttribute("role", t ? "alert" : "status");
}
async function T(e, t) {
	try {
		await b().open(e, t);
	} catch (e) {
		w(e.message, !0);
	}
}
function E(e, t) {
	if (!t) {
		let e = x("span", "text-warning", y("Missing current file")), t = S("exclamation-triangle");
		return t.tabIndex = 0, t.removeAttribute("aria-hidden"), t.classList.add("review-missing-help"), t.setAttribute("aria-label", y("Missing current file")), $(t).tooltip({
			container: "body",
			placement: "auto top",
			delay: {
				show: 400,
				hide: 0
			},
			title: y(p),
			template: "<div class=\"tooltip review-missing-tooltip\" role=\"tooltip\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div>"
		}), e.prepend(t), e;
	}
	if (!t.available) return x("span", "text-warning", t.name + " · " + y("Not available locally"));
	let n = x(b() ? "a" : "span", "review-file");
	return n.title = e.root + "/" + t.path, n.append(S("file"), x("span", "review-filename", t.name)), b() && (n.href = "#open-file", n.addEventListener("click", (n) => {
		n.preventDefault(), T(e, t);
	})), n;
}
function D(e) {
	return x("small", "review-file-meta", (e.bytes < 1024 ? e.bytes + " B" : Math.floor(e.bytes / 102.4) / 10 + " KiB") + " · " + new Date(e.modified).toLocaleString());
}
function O(e, t) {
	let n = x("dialog", "panel panel-default review-confirm");
	n.setAttribute("aria-label", y("Restore original name"));
	let r = x("div", "panel-heading");
	r.append(x("h4", "panel-title", y("Restore original name")));
	let i = x("div", "panel-body");
	i.append(x("p", "", y("Rename the selected conflict file to the original name. Other conflict files remain. An existing file will never be overwritten.")));
	for (let [n, r] of [["From", t.path], ["To", e.path]]) i.append(x("strong", "", y(n) + ":"), x("p", "review-confirm-path", e.root + "/" + r));
	let a = x("p", "text-danger");
	a.setAttribute("role", "alert"), i.append(a);
	let o = x("div", "panel-footer review-confirm-actions"), s = C("Cancel", null, () => n.close()), c = C("Rename", null, async () => {
		c.disabled = s.disabled = !0;
		try {
			await b().rename(e, t), await M(!0, e), n.close();
		} catch (e) {
			a.textContent = e.message, c.disabled = s.disabled = !1;
		}
	});
	c.firstChild.className = "text-warning", n.addEventListener("cancel", (e) => {
		c.disabled && e.preventDefault();
	}), n.addEventListener("close", () => n.remove()), o.append(s, c), n.append(r, i, o), document.body.append(n), n.showModal();
}
function k(e) {
	let t = x("tr", "review-row"), n = x("td", "review-context"), i = x("span", "review-path", e.folderName + (r(e.path) ? " / " + r(e.path) : ""));
	i.title = e.root + "/" + r(e.path), n.append(i);
	let a = x("td", "review-current");
	if (a.append(x("span", "review-cell-label", y("Current file")), E(e, e.current)), e.current) a.append(D(e.current));
	else {
		let t = x("small", "review-file-meta review-missing-hint", y("To keep a conflict file, rename it to:") + " "), n = x("span", "review-filename", e.name);
		n.title = e.root + "/" + e.path, t.append(n), a.append(t);
	}
	let o = x("td", "review-copies");
	function s() {
		o.replaceChildren();
		let t = e.copies.find((t) => t.path === v.selected.get(e.id)) || e.copies[0];
		if (e.copies.length > 1) {
			let n = x("select", "form-control input-sm review-version");
			n.setAttribute("aria-label", y("Conflict files") + ": " + e.name), n.title = t.name, e.copies.forEach((t, r) => {
				let i = x("option", "", `${r + 1}/${e.copies.length} · ${t.name}`);
				i.value = t.path, n.append(i);
			}), n.value = t.path, n.addEventListener("change", () => {
				v.selected.set(e.id, n.value), s();
			}), o.append(n);
		} else o.append(x("span", "review-mobile-label", y("Conflict files")));
		o.append(E(e, t));
		let n = D(t);
		if (n.classList.add("review-conflict-meta"), !e.current && t.available) {
			let r = C("Autoresolve", null, () => O(e, t));
			r.classList.add("review-autoresolve"), r.disabled = !b(), b() || (r.title = y(m)), r.firstChild.className = "text-warning", n.append(r);
		}
		o.append(n);
	}
	s();
	let c = x("td", "review-actions"), l = C("Open folder", "folder-open", () => T(e));
	return l.disabled = !b(), b() || (l.title = y(m)), c.append(l, C("Recheck files in folder", "refresh", () => M(!0, e))), t.append(n, a, o, c), t;
}
function A() {
	let e = document.querySelector(".conflict-review");
	$(e).find(".review-missing-help").tooltip("destroy");
	let t = v.search.toLocaleLowerCase(), n = v.groups.filter((e) => [
		e.folderName,
		e.path,
		...e.copies.map((e) => e.path)
	].some((e) => e.toLocaleLowerCase().includes(t)));
	e.querySelector("tbody").replaceChildren(...n.map(k)), e.querySelector(".review-empty").textContent = n.length || v.errors.length ? "" : y(v.groups.length ? "No matches" : "No conflict files remain");
}
function j() {
	let e = document.querySelector(".conflict-review");
	$(e).find(".review-missing-help").tooltip("destroy"), e.replaceChildren(), e.append(x("h3", "", y("Review in your file manager")));
	let t = x("div", "review-tools"), n = x("input", "form-control input-sm review-search");
	n.type = "search", n.placeholder = y("Search filenames or paths"), n.setAttribute("aria-label", n.placeholder), n.value = v.search, n.addEventListener("input", () => {
		v.search = n.value, A();
	});
	let r = C("Recheck all files", "refresh", () => M(!0));
	r.classList.add("review-recheck"), t.append(n, r), e.append(t, x("p", "review-message"));
	let i = x("table", "table table-striped review-table review-design-03");
	i.setAttribute("aria-label", y("Conflict files"));
	let a = x("thead"), o = x("tr", "review-column-headings");
	for (let e of [
		"Location",
		"Current file",
		"Conflict files",
		"Actions"
	]) {
		let t = x("th", "", y(e));
		t.scope = "col", o.append(t);
	}
	a.append(o), i.append(a, x("tbody")), e.append(i, x("p", "review-empty text-success"));
}
async function M(e = !1, t = null) {
	if (!v.loading) {
		v.loading = !0, v.errors = [], w(y("Loading data...")), document.querySelector(".review-empty").textContent = "";
		try {
			v.folders = await _.get("config/folders");
			let n = e ? await d(_, v.folders, t) : await u(_, v.folders);
			v.groups = t ? f(v.groups, t, n.groups) : n.groups, v.errors = n.errors, A(), w(n.errors.length ? n.errors.join("\n") : e ? y("Syncthing scan finished; file list updated.") : "", !!n.errors.length);
		} catch (e) {
			v.errors = [e.message], w(e.message, !0);
		} finally {
			v.loading = !1;
		}
	}
}
angular.element(document).ready(() => {
	let e = angular.element(document.documentElement).injector(), t = e.get("$translate"), n = () => {
		y = g({
			language: t.use() || "en",
			t: (e) => t.instant(e)
		}), j(), A();
	};
	n(), e.get("$rootScope").$on("$translateChangeSuccess", n), $("#conflicts-tab").on("shown.bs.tab", () => M());
});
//#endregion
