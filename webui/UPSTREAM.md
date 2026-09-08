# Updated Syncthing Web UI

This branch retains the AngularJS interface from Syncthing v2.1.3 at commit
946e2b83a1f6c6ae119427c09e0a5802940b82ff, with Syncshell's accepted folder/device
layout, three-column Overview, notification tab and conflict review interface.

The inherited templates/controller remain under modern/syncthing. The main
page template is index.html. app/main.js contains the conflict interface;
client contains its framework-independent API and conflict helpers. Build
using npm ci and npm run build. The build publishes modern/index.html and
modern/assets/compiled and updates SHA256SUMS. End users need no Node process.

AngularJS stays at 1.3.20, the version shipped in the reference. Its official
minified npm distribution replaces the oversized raw vendor file. The raw
npm source was compared with the reference; only the expanded license comment
differed. The full MIT license remains in vendor/angular/angular.js.LICENSE.
This changes packaging, not the Angular version or its supported widgets.
Other inherited library and Syncthing notices remain included.

Conflict discovery and rechecks use Syncthing's REST index and scan APIs.
The optional file-manager/rename capability is supplied by the Go review tool
for disposable tests; it is not a production server bundled with the UI.
The original Fancytree, Moment and date-range controls remain on this branch.

The existing Omarchy host prepares Modern and Omarchy profiles from the same
static tree. Omarchy adds the semantic palette and live refresh script.
Browser tests cover this branch's actual widgets; the native Svelte/Preact
component suites belong to their respective branches.
