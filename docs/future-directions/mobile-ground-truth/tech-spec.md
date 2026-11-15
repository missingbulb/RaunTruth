# Phone ground-truth tagging: mobile web vs app-only UI aspects

Tech-spec addition to the three phone designs (`nor/`, `shelves/`, `vascular/` `design-v2.md`). Nothing here is
built or run on a device. Premises taken from the designs: the phone computes nothing, fetches a lab-built pack
(images + a JSON of questions), records answers, and submits them in the desktop's ground-truth format.

**Verdict up front: mobile web carries all three designs. No requirement in them needs a native app.** What
the web lacks is either absent from the designs (3D, background compute) or has a cheap substitute. The real
risks are not "web vs app"; they are the shell's sign-in on a phone and iOS's storage rules, both below.

## How to read the evidence

| mark | source | trust |
|---|---|---|
| **[BCD]** | `@mdn/browser-compat-data` 8.1.9 (stamped 2026-11-12), the data behind MDN's and caniuse's tables, read as raw JSON. Current releases in it: Safari iOS 27.2, Chrome Android 157 | Exact text; best evidence here |
| **[WK]**, **[MDN]**, **[G]** | WebKit blog, MDN prose, Google developer docs, read through a summarizing fetch tool | Content right, wording not byte-exact |
| **[S]** | Search-result summary only (forums, third-party blogs) | Indicative; test on a device |
| **[U]** | My own knowledge, no source fetched this session | Unverified |
| **[repo]** | Read in this repo | Exact |

"Min version" columns say when a feature arrived, not what share of phones have it. Proposed floor for the
phone route: **iOS 18.4+ Safari, Android Chrome 125+** (the shell's own anchor-positioning floor would push iOS
to 26, see "Shell changes").

## What the shell does today that the phone inherits [repo]

| aspect | today | consequence on a phone |
|---|---|---|
| Supported browsers | `req/shell/browsers/supported`: desktop only; `web/browsers.js` `verdict()` fails anything `mobile` | Must be lifted for a phone route, by the owner |
| Sign-in | Google Identity Services token client (`web/account.js`), **a popup**; token lasts about 1 h, kept in `localStorage`; a new one only inside the user's click | The popup in an installed iOS web app is the top technical risk; no silent upload is possible after an hour |
| Scopes | `openid email profile drive.appdata drive.readonly`; `drive.readonly` is restricted, Google shows "unverified app" and caps new users at 100 (#803) | Every phone helper spends one of the 100 and sees the warning |
| Submit | `req/shell/ground-truth/submit`: one `gt_<email>.json` per tagger in `<image>__<sha8>/` in the study's Drive submissions folder, written with Google's per-file permission (`drive.file`) after the tagger approves the folder in Google's picker | A helper needs a Google account with edit access to that folder, and the picker step once |
| Drafts | `req/shell/ground-truth/draft`: `localStorage`, key `gt-draft|<study>|<image>|<sha>`, this device only | Evictable on iOS; no hand-over between devices |
| Offline | `web/sw.js` keeps the site's files and Pyodide; images kept in Cache Storage (`IMAGES`); `navigator.storage.persist()` asked in Prepare for Offline | The pattern to extend for packs |
| Install | `web/app.webmanifest`, `display: standalone`; the page names the manifest only after the user presses Install as an app (`req/shell/offline/per-study`) | iOS has no install prompt to call; instructions only |
| Server | None of the site's own | Web Push and any answer endpoint would be the site's first server |

## 1. Install, launch, deep links

| | iOS Safari tab | Android Chrome tab | installed PWA | native app |
|---|---|---|---|---|
| Install | none needed | none needed | iOS: Share, Add to Home Screen, by hand; no `beforeinstallprompt` **[BCD]**. Android: `beforeinstallprompt` from Chrome 44 **[BCD]** | store review, two codebases |
| Display | browser bars | browser bars | `standalone` both; `fullscreen`/`minimal-ui` Android only **[BCD]** | full control |
| Launch | tap a link | tap a link | icon; shell + first deck from the service worker cache, no network needed | icon |
| Deep link to "next question" | any URL works | any URL works | Android: an installed app captures in-scope links **[U]**. iOS: a link tapped in WhatsApp or mail opens **Safari, not the home-screen app** **[U]**; manifest `shortcuts` not supported on iOS **[BCD]** | universal links |
| Storage shared tab ↔ installed | - | shared **[U]** | **iOS: separate.** Cookies are copied once at add time, no other storage **[WK, Safari 17 notes, written about the macOS Dock]** | - |

Consequences:
- A deep link is plain URL state: `…/tag?pack=<id>` and the page resumes at the first unanswered question from
  the draft. Never encode the question index as the only truth.
- On iOS the tab and the home-screen app are two devices as far as drafts and sign-in go. Pick one per helper.
  **Recommend the Safari tab as the default** (links land there, sign-in popup is ordinary) and the home-screen
  app as an option for helpers who want notifications or tag weekly or more.
- Launch speed is a caching question, not a web-vs-app one: see the budget in section 10.

## 2. Storage

| | iOS Safari tab | Android Chrome | installed PWA (iOS) | native |
|---|---|---|---|---|
| Quota per origin | about 60% of disk, from iOS 17 **[WK]** | about 60% of disk **[MDN]** | same as the browser **[WK]** | disk |
| IndexedDB, Cache Storage, OPFS | yes; OPFS from 15.2 **[BCD]** | yes | yes | files |
| Eviction | LRU under pressure; **all script-writable storage deleted after 7 days of Safari use with no interaction on the site**: IndexedDB, localStorage, service worker registration and caches **[WK 2020, MDN]** | LRU under pressure only; "very rarely" in practice **[MDN]** | has its own day counter that real use resets; WebKit "does not expect" first-party data deleted there **[WK]** | never |
| `navigator.storage.persist()` | from 15.2 **[BCD]**; granted by heuristics "like whether the website is opened as a Home Screen Web App", no prompt **[WK]** | from 55, heuristics, no prompt **[BCD, MDN]** | most likely granted | n/a |

"7 days of Safari use" counts days the browser is used, not calendar days **[WK]**; a helper who opens the page
weekly keeps resetting it, one who comes back after a month of browsing elsewhere finds it empty: pack, draft,
sign-in and service worker all gone at once (eviction is per origin, all or nothing **[MDN]**).

Design rules that follow, independent of platform:
1. **A pack is a cache, never state.** Re-fetchable by id, held in Cache Storage beside `IMAGES`, listed and
   clearable in Manage storage (`req/shell/storage/manage`). Losing it costs a download.
2. **Unsent answers are the only thing worth protecting, so keep few of them.** Send at every deck end (about 40
   answers in the vascular design, similar in NoR). The worst loss is then one deck, a few minutes.
3. **The submitted file is the hand-over**, as the shelves design already concluded. On open, the page reads
   the helper's own `gt_<email>.json` and resumes after it, so a wiped device or a second device loses nothing sent.
4. Call `persist()` when the first deck is answered (a gesture, and the shell already calls it elsewhere) and
   record what it returned: a draft on a non-persisted origin shows "kept on this phone until sent".
5. Drafts stay in `localStorage` under the existing `gt-draft|` key (a deck's answers are a few KB), so
   Continue tagging, Clear progress and Manage storage work unchanged and no second location is earned.

## 3. Offline and upload

| | iOS (tab or installed) | Android Chrome | native |
|---|---|---|---|
| Service worker, Cache Storage | yes | yes | n/a |
| Background Sync (`SyncManager`) | **no** | from 49 | background tasks |
| Periodic sync, Background Fetch | no | 80, 74 | yes |

All **[BCD]**. Background Sync would not help here even on Android: the upload needs a Google token that lasts an hour
and can be renewed only inside a tap **[repo, G: "a user gesture triggers the token flow"]**. So one upload design
serves every platform:

- An **outbox** in `localStorage`: finished decks not yet in Drive, each with its target file and a content hash.
- Flush on: deck end (the Send tap), page open, `visibilitychange` to visible, `online`. If the token is live,
  send silently. If not, show one line, "2 decks waiting to send", with a **Send** button whose tap renews the
  token and flushes.
- A flush is idempotent: it reads the helper's file, merges by question id, replaces the file (the shell's
  `replace` keeps Drive's earlier revision forever).
- A deck can be answered fully offline once fetched; the next deck is prefetched while the current one is
  answered (section 10). The page says "sent" only after Drive answered: an absent confirmation is shown as
  waiting, never as done (public-website pack, judging-failed-fetch).

A native app could upload in the background only with its own long-lived credential, which is a different
sign-in, not a UI nicety.

## 4. Input

| need | web answer | iOS note | Android note |
|---|---|---|---|
| Targets | 48 CSS px, 8 px apart (the designs already say 44 to 48); test by bounding box | | |
| Taps, drags, loupe | Pointer Events + `setPointerCapture` | from 13 **[BCD]** | from 55 |
| Double-tap zoom, 300 ms delay | `touch-action: manipulation` on controls; `touch-action: none` on the chip that takes swipes; `pinch-zoom` only on shelves task 7 | 9.3; `pinch-zoom` 13 **[BCD]** | 36; 56 |
| Pull-to-refresh, scroll chaining | `overscroll-behavior: contain` on a root that really scrolls, or a fixed layout with no document scroll | 16, **no effect on a container with no scrollable overflow** **[BCD]** | 63, same caveat until 144 **[BCD]** |
| Edge-swipe Back | **Cannot be disabled by a page on either platform [U]**. Keep the session one history entry (`replaceState` per question) so the swipe has nowhere to go in the home-screen app; in a tab it leaves the page, and the draft brings the helper back to the same question. Keep swipe-to-answer on the chip only and off the outer 24 px, as the designs say. Optional: one guard history entry whose `popstate` means the design's own Back | system gesture | system gesture; Android's Back button too |
| Long-press callout, text selection, image drag | `-webkit-touch-callout: none` (iOS only **[BCD]**), `user-select: none`, `draggable=false`, chips drawn on `<canvas>` or as CSS backgrounds | | long-press on `<img>` opens a menu **[U]** |
| Hold-to-enlarge (vascular round 3) | pointer capture + the above; a hold must not trigger selection or callout | test on device | test on device |
| Hebrew titles (shelves sitting B) | `dir="auto"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="next"`, `inputmode="text"`; `lang` left unset so the keyboard is the helper's own **[U]** | `autocorrect` 14.5, `inputmode` 12.2, `enterkeyhint` 13.4 **[BCD]** | `autocorrect` only from Chrome 153; `inputmode` 66 **[BCD]** |
| Keyboard covering the chip | Pin the chip to `visualViewport` (`resize`/`scroll` events) and size with `dvh`; do not rely on `interactive-widget` yet | VisualViewport 13; **`interactive-widget` only in 27.3 beta** **[BCD]**; `VirtualKeyboard` API absent | `interactive-widget` 108, `VirtualKeyboard` 94 **[BCD]** |
| Input zoom on focus | font-size 16 px or more in the field **[U]** | iOS zooms smaller fields | |

Completion for titles (prefix index over `heb.txt` + `names.txt`) is a lookup in a shipped file; it stays within
"the phone computes nothing" only if the index is built by the lab and fetched with the pack.

## 5. Feedback

| | iOS Safari / PWA | Android Chrome | native |
|---|---|---|---|
| `navigator.vibrate` | **no** | from 32, needs a user gesture from 60 | full haptics |
| Reduced motion | `prefers-reduced-motion` 10.3 | 74 | yes |

**[BCD]**. An iOS workaround (toggling a hidden `<input type=checkbox switch>`) is reported, and reported patched in
iOS 26.5 **[S, third-party README]**: do not build on it.

Decision: **feedback is visual and identical on both platforms**: the answered chip takes the answer's colour
and leaves in 150 ms or less; under reduced motion (and with the shell's animations setting off) it changes state
with no movement. `navigator.vibrate(10)` may be added on Android as an extra, feature-detected, never the only
signal. No sound at all: tagging happens in shared rooms, and it would need an audio unlock per session.
Test motions through `web-tests/page_motions.mjs` (on, starts, ends in the right state), per the repo rule.

## 6. Display

| need | iOS Safari tab | Android Chrome | installed PWA | native |
|---|---|---|---|---|
| Wake lock | `navigator.wakeLock` 18.4 **[BCD]** | 84 | iOS: **broken in home-screen apps 16.4 to 18.3**, fixed 18.4 **[BCD, webkit.org/b/254545]** | yes |
| Fullscreen | **no on iPhone** (iPad only, with an overlay) **[BCD]** | `requestFullscreen` 71 | standalone hides browser bars; that is enough | yes |
| Orientation lock | `screen.orientation.lock` **no [BCD]** | 38, in fullscreen or installed **[U]** | manifest `orientation`: Android yes, **iOS no [BCD]** | yes |
| Safe areas | `viewport-fit=cover` + `env(safe-area-inset-*)` | same; Chrome 135 draws under the gesture bar **[G]** | same | yes |
| Dark mode | `prefers-color-scheme` 13 | 76 | same | yes |
| Brightness, True Tone, Night Shift | **not readable, not settable [U]** | same **[U]** | same | app can set brightness |
| WebGL2 | 15 **[BCD]** | 58 | same | Metal/GL |

- **Wake lock**: request while a deck is open, release on `visibilitychange` hidden and re-request on visible.
  A question takes 2 to 10 s, so the screen rarely dims anyway; treat a refused lock as normal.
- **Orientation**: design portrait, and make landscape harmless (the same layout letterboxed) rather than
  locked. So the brief's "PWA manifest only" holds on Android; on iOS not even that.
- **Brightness and glare**: the one place a native app is genuinely better, and it matters for faint signal
  (NoR's red spots, vascular gaps). Web substitute, which also measures what the app could only assume: the
  practice deck carries a faint-step card ("how many bars do you see?") and the gold chips already in the
  designs include faint positives; a helper who fails them is told to raise brightness, and the pack's answers
  record the card's result. Dark surround by default for microscope chips, whatever the theme.
- **Colour**: an untagged PNG is treated as sRGB by both browsers **[U]**. The pack builder writes 8-bit sRGB,
  no `gAMA`/`iCCP` chunk, the levels already applied (NoR's "level-turned" chip), so a phone and the desktop
  show the same numbers; what differs is the panel, which the faint-step card covers. No wide-gamut or 16-bit
  path is needed since chips are display-referred.
- **Image memory on iOS**: a decoded image costs 4 bytes a pixel whatever the PNG weighs. Reported limits, all
  **[S]**: canvas area 16,777,216 px (4096 × 4096) on older iOS, raised to 8192 × 8192 around iOS 18; a total
  canvas-memory cap (384 MB reported on iOS 15); a tab is killed and reloaded under memory pressure **[U]**.
  Rules: no sprite or image wider or taller than 4096 px; one deck decoded at a time, the previous one released
  (`ImageBitmap.close()`, canvas set to 0 × 0); draw into a single reused canvas; vascular strips decode only
  the item's own 9 slices. A 16 to 33 MB vascular stack must never be decoded whole: measure its pixel count ×
  4 before fixing the deck size. A reload from memory pressure is survivable because of the draft.
- **3D**: none of the three designs needs it on the phone (vascular ribbons and side cuts are lab-rendered
  pictures). Do not bring `viewer3d.js` to the phone route.

## 7. Camera (shelves, at the shelf)

| route | prompt | iOS | Android | fit |
|---|---|---|---|---|
| `<input type="file" accept="image/*" capture="environment">` | none from the browser: the OS camera opens, the user hands back one photo | 10 **[BCD]** | 25 | **Use this**: full-resolution still, no permission, works in a tab |
| `getUserMedia` | browser permission prompt, repeated more often on iOS **[U]** | 11 **[BCD]** | 53 | live preview only; not needed |
| native | OS prompt once | | | no gain for one still |

The v2 design's at-the-shelf mode types titles off the book and needs no camera. If a new photo is ever taken
there, it is a new image: it must reach Drive before it can have ground truth (`req/shell/ground-truth/layout`:
only a Drive image can be submitted), which is an upload of a user's photo and a new disclosure.

## 8. Notifications ("round 2 is ready", vascular)

| | iOS Safari tab | iOS home-screen app | Android Chrome | native |
|---|---|---|---|---|
| Web Push | **no**: `Notification` is undefined | 16.4+, permission only from a tap **[BCD, WK]** | 42, tab or installed | APNs/FCM |
| App badge | no | `setAppBadge` 16.4 | no | yes |

**[BCD]**. Push also needs something to send it: a stored subscription per helper and a sender holding a signing key.
The site has no server, so this would be its first, plus a permission prompt, for an event that happens three
times per stack. **Recommend none in the first build**: the lab lead sends the helper the round's link (the
same deep link as section 1) in whatever channel they already use, and the page's own list shows "round 2
ready" on open, read from the pack listing. Revisit only if helpers demonstrably miss rounds.

## 9. Sign-in on a phone

The shell's flow is Google's token client, which is popup-only ("only the dialog UX is supported") **[G]**.

| context | expected | evidence |
|---|---|---|
| iOS Safari tab, Android Chrome tab | popup opens as a new tab from a tap, returns | **[U]**; works on desktop today **[repo]** |
| Android installed PWA | opens a browser view over the app, returns | **[U]** |
| **iOS home-screen app** | conflicting reports: popups blocked or opened in Safari with no way back, redirect flows said to work, one 2024 claim that Google sign-in works | **[S]**, nothing authoritative found |

Plan:
1. Test the existing flow on a real iPhone in both contexts before designing anything (one hour, decides the
   rest). `web-tests` cannot prove it.
2. If the home-screen popup fails: a **full-page redirect** to Google and back for the phone route only (same
   Google, same scopes, a different window), with the draft and outbox making the round trip safe. This is a
   change to when and how Google is called, so it is its own approval question.
3. Token renewal stays inside taps the helper makes anyway (Send, Start deck).
4. Scopes: a phone helper needs to write one file, not read the user's Drive. If packs are readable without the
   user's token, the phone route could ask for `openid email` + `drive.file` only, skipping the restricted
   `drive.readonly` (no "unverified app" screen for it, no seat of the 100). A narrower request, but still a
   changed permission request: owner's call.
5. The folder approval in Google's picker (`req/shell/ground-truth/tagger-access`) on a phone screen is
   untested **[U]**. If awkward, a helper approves once on a desktop; whether the grant then holds on the phone
   needs checking against Google's docs.

A native app would use the system sign-in sheet and a refresh token, which removes the hourly tap. That is the
only real auth advantage, and it needs a backend or a native client id either way.

## 10. Performance budget

Target: **first answer possible within 5 s on a mid-range Android over 4G, cold; within 1 s warm.** At roughly
5 Mbit/s that is about 600 KB/s after a round trip or two, so the cold path may carry about 1.5 MB in total.
These figures are a budget to test against, not measurements.

| item | budget (compressed) | note |
|---|---|---|
| Phone page HTML + CSS + JS | 150 KB | **No Pyodide, no `worker.js`, no viewer**: the desktop shell pulls about 50 MB of Python **[repo, `sw.js`]** |
| Sign-in script | 0 on the first-answer path | loaded on the Send tap, as the shell does today |
| Deck JSON | 30 KB | questions, order, pack and finder version |
| First images | 300 KB | **a "first screen" image separate from the deck's sprite**, so question 1 does not wait for 1 to 2 MB |
| Rest of deck 1 | 1 to 2 MB, in the background | answered questions never wait on it if the first-screen image covers 5 to 10 of them |

| study | pack per deck | per image or stack | prefetch |
|---|---|---|---|
| NoR | chip sprite 1 to 2 MB (about 310 singles + 103 sheets per image; split by deck) | several MB per image | next deck while answering |
| Shelves | the photo (re-encoded to the phone's needs, 0.5 to 1.5 MB) + frames JSON | one photo | next photo |
| Vascular | 1 to 2 MB of PNG sub-volumes | **16 to 33 MB per stack** over 5 to 10 decks, three rounds | next deck only; show each deck's size on its button |

Neither browser reports "on cellular" reliably (`navigator.connection` is absent on iOS **[U]**), so the page
never guesses: it prefetches one deck ahead and no further, and Make Available Offline for a whole stack is an
explicit tap with the size stated, as Prepare for Offline does today.

## 11. Shell changes

**Lifting `req/shell/browsers/supported`.** Keep the desktop rule as it is. Add a sibling requirement (owner
sets it and its tag), saying: the phone tagging route supports Safari on iOS and Chrome on Android
from named versions, kept in `web/browsers.json` under a second list; `verdict()` takes the route. On the
desktop page a phone stays unsupported, and its warning can link to the phone route. The desktop floor is CSS
anchor positioning (Safari 26); the phone page should not use anchored popups at all, which lets its floor be
iOS 18.4 (wake lock in home-screen apps) instead of 26. Firefox Android and Samsung Internet: unsupported at first.

**A separate route, not a responsive desktop page.**

| | separate phone route | responsive desktop page |
|---|---|---|
| Payload | about 150 KB | Pyodide and the viewers, about 50 MB |
| Requirements touched | one new branch; desktop untouched | every `req/shell` layout rule (left bar, popups, status bar) gains a phone case |
| Risk to the desktop page | none | every desktop change needs a phone check |
| Shared code | sign-in, Drive writer, `truth_folders.js`, draft keys, service worker, theme | everything |

Proposed shape (names are placeholders): `rauntruth.com/app/<id>/tag`, the study's own page under
`studies/<id>/web/` built into the wrangler `assets.directory` tree; a small shared kit in `web/` (deck runner,
outbox, pack cache) that imports the existing `account.js`, `drive.js`, `truth_folders.js`. The shell still
names no study (`req/shell/study/knows-none`). Internal links without `.html`. `sw.js` learns the phone route
and a packs cache; `offline.json` already covers the page's own files.

Open design point for the owner, raised by NoR and shelves: the `designing-ground-truth-tasks` skill (one
walk, area by area, a left bar) cannot hold on a phone as written; the phone route needs its own stated rules.

**Tests** (`web-tests/`, Playwright; `engine.mjs` already switches engine by `PW_ENGINE`):

| proves | how |
|---|---|
| Layout holds at phone size | contexts from Playwright's `devices` (a Pixel and an iPhone descriptor: viewport, touch, UA): no horizontal scroll, every answer control 48 px or more and 8 px apart, by bounding boxes |
| Phone route is supported, desktop page still warns on a phone | `browsers.js` unit cases + the report icon on both routes |
| Nothing heavy loads | no request to jsDelivr or for Pyodide on the phone route (`off_site.mjs` style request log) |
| Offline deck | fetch a pack, `context.setOffline(true)`, answer, reload: the draft resumes at the same question |
| Outbox | offline Send queues; back online + a tap flushes once to the stand-in Drive (`stand_in_drive.mjs`); a second flush changes nothing |
| Wiped storage | clear storage mid-stack: the page resumes after what the stand-in Drive holds |
| Keyboard does not hide the chip | resize the visual viewport, assert the chip stays inside it |
| Motion | `page_motions.mjs`, with reduced motion emulated: state changes, nothing moves |
| Images | small ones drawn in the test (repo rule), never a study's data |

Emulation proves layout and logic only. It cannot prove: the iOS sign-in popup in a home-screen app, 7-day
eviction, real keyboard behaviour, edge gestures, memory kills, glare. Those go on a **one-page device
checklist** (two phones: one iPhone, one mid-range Android) filed as its own hand-over issue and run once per
release that touches the phone route. Time-to-first-answer is measured with CDP throttling in Chromium and
recorded, not gated (a fuzzy metric).

## Need → mobile web? → app needed?

| need | mobile web | app needed? | verdict |
|---|---|---|---|
| Show a question, take a tap, a swipe, a hold, a corner drag | yes | no | web |
| Fetch and keep packs offline | yes (Cache Storage) | no | web |
| Keep unsent answers safe | mostly: iOS tabs can lose them after 7 days of Safari use elsewhere | no | web, with send-per-deck and resume-from-Drive |
| Upload in the background | Android only, and useless with an hourly token | only with a different sign-in | web, flush on open and on Send |
| Home-screen icon, no browser bars | yes; by hand on iOS | no | web |
| Deep link to the next question | yes; on iOS it lands in Safari, not the home-screen app | only for link capture on iOS | web, Safari tab as the iOS default |
| Haptic tick per answer | Android only | for iOS haptics | web, visual feedback |
| Keep the screen on | yes (iOS 18.4+) | no | web |
| Fullscreen | standalone on both; true fullscreen not on iPhone | no | web |
| Lock portrait | Android installed only | for iOS | web, layout that survives rotation |
| Control brightness, defeat True Tone | no | **yes, the only real gap** | web, faint-step card + gold chips |
| Hebrew typing, keyboard not covering the chip | yes (VisualViewport) | no | web |
| Take a photo at the shelf | yes (`<input capture>`, no prompt) | no | web |
| "Round 2 is ready" | iOS only when installed; needs a push server | no | neither: send the link |
| Sign in with Google | tab: yes; iOS home-screen app: unproven | no | web, test first, redirect as fallback |
| 3D | WebGL2 available; not needed | no | not needed |
| First answer in 5 s on 4G | yes, if the phone route skips Pyodide | no | web, separate route |

## Network calls and permissions this introduces (each an owner approval question)

Per the nor-finder rule (network-calls-approved), each is its own question; none is approved by this spec.
The privacy policy's "Services the page reaches" and "kept on this device" lists change with each one accepted.

| # | call or permission | what, when, by whom, how often | alternative |
|---|---|---|---|
| 1 | **Fetch a pack** | the helper's phone reads the deck JSON and images at deck start, one deck ahead; from the study's Drive folder (Google sees it, as for images today) or from the site (Cloudflare) | Decide the host. Site-hosted packs publish study images on a public site, and Workers static assets have a per-file size limit **[U, check]**; Drive keeps data where it already lives |
| 2 | **List available packs / rounds** | on opening the phone route, and on `visibilitychange` | fold into 1 as one index file |
| 3 | **Read the helper's own submitted file** | on open, to resume | none; this is what replaces cross-device drafts |
| 4 | **Write answers at each deck end** | Drive create/replace in the submissions folder, about 5 to 10 times per stack instead of once per image | once at the end (more to lose) |
| 5 | **Retry on open / visible / online** | same call as 4, at new moments, never without a tap once the token has lapsed | none |
| 6 | **Sign-in by full-page redirect** on the phone route | only if the popup fails in the iOS home-screen app | tab-only on iOS |
| 7 | **Narrower scopes on the phone route** (`openid email drive.file`, no `drive.readonly`) | at the helper's first sign-in | keep today's scopes (unverified-app screen, 100-user cap) |
| 8 | **Folder approval in Google's picker on a phone** | once per helper | approve on a desktop |
| 9 | **The lab reads answers between rounds and writes the next round's pack** (vascular) | lab side, per round; who runs it and where is the vascular design's open question 1 | - |
| 10 | **Persistent storage** `navigator.storage.persist()` | after the first deck; no prompt on Chrome or Safari | already used in Prepare for Offline; new moment |
| 11 | **Screen wake lock** | while a deck is open; no prompt | none; screen may dim |
| 12 | **Vibration** (Android) | 10 ms per answer; no prompt | leave out |
| 13 | **Camera through `<input capture>`** and **upload of the photo to Drive** (shelves, only if photos are taken at the shelf) | per photo | not in v2's first build |
| 14 | **Web Push**: notification permission, a subscription sent to a new server, a sender | per round | recommended against; send the link |
| 15 | **CI**: Playwright phone-emulation runs, plus WebKit on the phone route | per pull request or nightly, as `req/checks/other-engines` | - |

Also for the owner, not network calls: the new browsers requirement; whether drafts on a phone may be lost by
iOS (and so "send per deck" is the rule); the phone exception to the ground-truth task skill.

## Recommendation

1. **Build it as mobile web, as a separate light route per study, in a browser tab first.** No design
   requirement needs an app; the app-only gains (brightness control, iOS haptics, orientation lock, background
   upload) are either substituted or not needed for 2 to 10 second questions.
2. **Make loss cheap instead of fighting the platform**: packs are caches, answers go to Drive at every deck
   end, the submitted file is the resume point. That one decision absorbs iOS eviction, tab-vs-home-screen
   isolation, memory kills and the missing Background Sync.
3. **Before any UI work, run two one-hour spikes on real phones**: (a) the shell's existing Google sign-in and
   picker approval in an iPhone tab and home-screen app and on Android; (b) decode one real vascular deck and one
   NoR sprite on a 4 GB Android and an older iPhone, watching memory. Both are where the web could actually
   fail, and neither can be shown by emulation.
4. **Treat "installed PWA" as an optional comfort**, not the product: on iOS it splits storage from the
   tab that links open in, and it is the unproven sign-in context.
5. **No push, no sound, no camera, no 3D in the first build.**
6. If a native shell is ever wanted (store presence, brightness), wrap this same page (a Trusted Web Activity
   on Android, a web-view wrapper on iOS) rather than rewrite it. Note a wrapper's web view gets a smaller
   storage quota on iOS (about 15% of disk against 60%) **[WK]**.

## Not verified here

- Every **[U]** and **[S]** line above; most important: iOS home-screen sign-in, link capture, the picker on
  phones, canvas and memory limits on current iOS, untagged-PNG colour handling, the Workers per-file limit.
- All byte and second figures are budgets or the designs' own estimates; nothing was measured on a phone.
- Version numbers come from compat data, which records arrival, not behaviour under load.
