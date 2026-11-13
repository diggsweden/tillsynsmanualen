## v2.2.19

- Added prettier and formated all files

## v2.2.18

- Adjusted regex to allow the use of identifiers containing numbers

## v2.2.17

- Added Tillgänglighetsredogörelse (app) for documents

## v2.2.16

- Added Tillgänglighetsredogörelse (app) for documents
- Changed wording for method and thumb-control and added information box.

## v2.2.14

- Changed referece for sensory-links and sensory-buttons

## v2.2.13

- App version/date ref MDFFS 2019:2 §6.2

## v2.2.12

- Bugfix: Ensure "statementApp" is treated as "statement" in filtering logic

## v2.2.11

- Empty URL was set to "undefined"
- Removed 4-digit limit for serial number
- Further styling for multiple checks
- More requirements for app statements

## v2.2.10

- Changed "Förväntningar" to "Krav"
- Removed fill from two elements
- Statement for app
- Filtering 1.4.10/1.4.11 for Android only
- Bug fix: platform was not set for AppScreen
- Modified validation, formatting of case numbers
- Visual styling of multiple checks
- Changed title for SFS2019:2 6 § 1 st 1p
- Changed check text for 9.3.3.1
- Modified info for 11.1.4.10
- Changed default observation for 11.1.3.4
- Added info for 11.5.2.13
- Added exceptions for 9.1.4.3
- Added "approvable" to config doc
- Bug fix for autoapprove button
- Setting "approvable" when populating requirements
- Aligned unit tests with protocol changes
- Added "approvable" field to Requirement
- Resolved merge conflicts
- Bug fix in app protocol

## v2.2.9

- Cancel auto-approve on manual fail
- Wrong return path on delete.
- Typo in comment
- Typo in instruction

## v2.2.8

- Refactoring of audit protocol

## v2.2.7

- Bug fixes in protocol
- Re-added check for font in 11.7
- Reduced spacing in protocol layout
- Changed "important" message for 11.7
- Removed contrast check for 11.7 (apps)

## v2.2.6

- Bug fix in app protocol
- Wrong config file names in documentation

## v2.2.4

- Updated with release comments
- Removed unused code
- Wrong number for two clauses
- Instructions for 11.7 (contrast)
- Screenshot per sample per req in protocol
- Showing CSV ID in protocol
- Showing mapped principles in protocol
- Protocol ToC per principle
- Removed fails-by-sample from protocol
- Mapping clauses to principles
- Wrong config file names in documentation

## V2.1-3

- **CONFIG** (1, `*`): Rename content types.
- **CONFIG** (`*`): Valid from/to date for content types.
- **NEW** (`audit`): New audit categories: documentation, support.
- **STYLING** (`sample-new`): Button redesign.
- **STYLING** (`sample-new/edit`): Increased margin below component content type list.
- **MOD** (`controllers`): More verbose breadcrumb trail.
- **MOD** (`audit-display`): New columns: connection count.
- **MOD** (`requirement`): Derived check dependencies open in new view.
- **NEW** (`sample-new`): Confirm components on save.
- **NEW** (`sample-edit`): Page/screen connections for components.
- **MOD** (`sample-edit`): New non-linear sampling process.
- **CONFIG** (`*`): Renamed component config files.
- **BUG** (`sample-edit`): Type change + default components caused invalid sample.
- **CONFIG** (`screen*`): Changes requested by client.

## V2.1-2

- **NEW** (`sample-display`): Showing sample URL as QR code.
- **BUG** (`sample-edit`): Preceding process step not populated.
- **BUG** (`checks`): Separate checklists for open/closed functionality.

## V2.1-1

- **BUG** (1, `sample-new/edit`): Adding webpage to app sample with components caused crash.
- **MOD** (`appcontext`): Set advanced mode by default (temporarily).
- **MOD** (`appscreen &c`): Flag for open/closed functionality.
- **NEW** (`sample-display`): Undoable auto-approval of unchecked requirements.
- **NEW** (2, `case-edit`): Convert audit case to monitoring case.
- **MOD** (2, `audit-display`): Visual redesign.
- **MOD** (2, `requirement`): Button redesign.

## V2.0-5

- **NEW** (1, `sample-display`): Function for indicating partial audit.
- **NEW** (`sample-display`): Feature to copy selected requirements from another sample.
- **NEW** (2, `csv`): Generate case/audit meta information.
- **NEW** (`sample-display`): Filter: status/ext/int note.
- **MOD** (1, `sample-display`): Visual redesign.
- **MOD** (1, `csv`): Rename CSV protocol.
- **NEW** (1, `protocol/csv`): Failure ID to facilitate mapping.
- **NEW** (1, `csv`): Additional columns.
- **MOD** (1, `sample-new/edit`): Moved content type descriptions from About page.
- **MOD** (1, `requirement`): Add description + change icon on seq nav buttons.
- **MOD** (1, `*`): Remove all positive feedback status messages.
- **MOD** (1, `sample-display`): Added link to audit overview.
- **MOD** (1, `requirement`): Added link to audit overview.
- **MOD** (1, `sample-display`): Changed internal note icon to speech bubble.
- **MOD** (1, `requirement`): Linking to sample.
- **MOD** (1, `sample-display`): Linking to sample.
- **MOD** (1, `audit-display`): Displaying sample counts.
- **MOD** (1, `*`): 'Skärmbild' replaced by 'vy'.

## V2.0-4

- **BUG** (`protocol`): Components were not included in inaccessibility metric.
- **CONFIG** (`*`): Typos.
- **STYLE** (`audit`): Advanced/simplified mode indicator.
- **STYLE** (`audit`): Page menu items were right aligned.
- **BUG** (`requirement`): Derived sources now shown for conditional checks.
- **MOD** (`contrast`): Support for % in rgb(), rgba().

## V2.0-3

- **BUG** (`csv`): Status, date columns were not added.
- **MOD** (`protocol`): Status, info styling.
- **MOD** (`protocol`): Static 2-level ToC.
- **CONFIG** (`remarks`): Added MDFFS 2019:2 §2, 2nd p.
- **STYLE** (`manual`): Added color-scheme.

## V2.0-2

- **BUG** (`sample-edit`): Changing category did not update view fields.
- **MOD** (`protocol`): Do not show unfailed components.
- **CONFIG** (`webpage`): Removed incorrect `<hgroup>` info.
- **STYLE** (`case`): Added border to download buttons.

## V2.0-1

- **BUG** (`check`): State was not persisted with undefined applicability.
- **BUG** (`sample-display`): Audit button was not hidden when done.
- **BUG** (`requirement`): Wrong status if requirement not populated.
- **CONFIG** (`document`): Removed reference to content type "edt".
- **BUG** `1` (`sample-new`): Crash on toggling existing component.
- **MOD** (`sample-edit/new`): Component dialog.
- **MOD** `3` (`icons`): New trashcan icon.
- **BUG** `1` (`protocol`): Adapted to component related changes.
- **MOD** `2` (`case/audit`): Added `aria-labelledby` to listing buttons.
- **MOD** `2` (`*`): Added dummy href to links in page fragments.
- **BUG** `1` (`requirement`): Crash for derived check with excluded source requirement.
- **BUG** `1` (`model`): Crash on reading sample with component added after containing sample.
- **BUG** `1` (`sample-new`): Default name does not trigger uniqueness check.
- **BUG R** `1` (`sample-edit`): Invalid audit ID in added component.
- **BUG** `1` (`start`): Advanced mode not retained on return to start.
- **BUG R** `#71/104` `1` (`req`): Document: "Innehållets ordning", next -> crash.
- **BUG** `1` (`sample-edit/new`): Prevent duplicate references in 'follows'.
- **BUG** `1` (`sample-edit`): Crash when changing category (readonly property).
- **BUG** `1` (`model`): Unserialize fails if 'req' not in sample.
- **BUG** `1` (`model`): Unserialize fails if component not yet restored.
- **BUG** `1` (`*`): Req/check: incorrect state w/ derived checks.
- **BUG** `#220` `1` (`*`): 9.6 not failed if only component has failures.
- **BUG** `1` (`sample-edit`): `sample.removeComponent()` -> `.deleteComponent()`.
- **BUG** `1` (`sample-edit`): `#addComponentsToView()`: check if sample can have components.
- **MOD** `2` (`injunction`): Use 1-3 paragraph in legal reference.
- **MOD** `2` (`requirement`): Status + link for dependencies for derived checks.
- **BUG** `2` (`protocol`): webbriktlinjer links have `lang=en`.

## V2.0-RC7

- **MOD** (`*`): Grids removed b/c of AT incompatibility.
- **CONFIG** `#6` `1` (`screen/c`): Add colour-error to screen/app component configs.
- **NEW** `#11` `1` (`protocol`): Status (fail/remark) per requirement.
- **BUG R** `#13` `3` (`contrast tool`): Error msg when copying output to clipboard.
- **MOD** `#17` `3` (`case-display`): Show documents below audits.
- **BUG** `#21` `1` (`protocol`): Wrong heading level for "all pages with...".
- **CONFIG** `#34` `1` (`*`): Rename content type "Radering av data" to "Radering eller ändring av data".
- **CONFIG** `#52` `1` (`*`): All reqs for content type 'btn' should also apply for 'mp'.
- **MOD** `#53/210` `1` (`case-edit`): Prevent saving new case with existing case number.
- **BUG** `#56` `1` (`sample-display`): Manual condition w/ derived check gets wrong status.
- **MOD** `#64` `2` (`sample-display`): Show SC# for requirements.
- **BUG** `#65` `1` (`case-edit`): Handle unknown schedule.
- **BUG** `#70` `1` (`case-edit`): "Maximum call stack size exceeded" on `reportCustomValidity()`.
- **BUG** `#70` `1` (`case-edit`): Empty email field set to "unknown" on editing existing case.
- **BUG** `#73/201` `1` (`sample-edit`): Handle delete/rename of referred process step.
- **MOD** `#74` `1` (`protocol`): Change "Komponenter" to "Återkommande innehåll".
- **BUG** `#75` `2` (`checks`): "Nivå undefined" for screen requirements w/ open functionality.
- **CONFIG** `#78` `3` (`contrast-text`): Add note that IOT contrast checked separately.
- **NEW** `#80` `1` (`injunction`): Update template.
- **CONFIG** `#103` `3` (`document`): Typo "Dokuemntets".
- **BUG** `#200` `2` (`sample-edit`): Component -> "unknown category" in breadcrumbs.
- **MOD** `#202` `3` (`audit-display`): Change default date to +5 months for remarks/injunctions.
- **MOD** `#203` `1` (`*`): Hide disabled links/buttons.
- **NEW** `#204` `1` (`audit-display`): Delete remarks/injunction feature.
- **MOD** `#206` `1` (`audit-display`): Change dialog btns to Yes/No.
- **NEW** `#207` `1` (`audit-display`): Show protocol link for unfinished audit.
- **MOD** `#211` `3` (`case-display`): "Protokoll" -> "Granskningsprotokoll".
- **BUG** `#212` `1` (`audit-display`): App-specific fields shown for website samples.
- **MOD** `#213` `3` (`about`): Typo "ganska" -> "granska".
- **MOD** `#214` `3` (`about`): Typo "åtrgärdade".
- **NEW** `#215` `1` (`*`): Skip link target should be H1, not `#start-of-content`.
- **NEW** `#216` `1` (`start`): Focus "previous" link on return to start page.
- **BUG** `#217` `1` (`req`): Screen, video-only:video-alt-equal state not shown.
- **BUG** `#218` `1` (`case-edit`): Schedule not required for monitoring case.
- **MOD** `#219` `2` (`audit-display`): Wrap doc links in `<span>` (whole cell should not be clickable).
- **NEW** `#221` `1` (`audit-display`): Unlock feature for finished audit.
- **MOD** `#222` `2` (`audit-display`): Buttons Påpekande/Föreläggande -> Skapa $1.
- **MOD** `#223` `1` (`sample-edit/new`): Provide feedback on adding component.
- **MOD** `#224` `1` (`sample-edit/new`): Button "Lägg till" -> "Lägg till komponent".
- **MOD** `2` (`settings`): Clear status msg on input.
- **CONFIG** (`screen/c`): Change title of 'info-rel'; add "beräknad".

## V2.0-RC6

- **MOD** (`Requirement`): Remove red border/text on fail fields.
- **TYPO** (`Requirement/Internal note`): "prootkollet".
- **BUG**: Advanced mode not set/retrieved correctly.
- **BUG**: `CSVProtocolView` used obsolete Requirement features.
- **MOD**: Replacing newlines with spaces in CSV protocol due to Excel bug.
- **BUG**: Audit display: "Fortsätt granska" is not using display order.
- **BUG**: Edit sample: set/unset component not working.
- **BUG**: Status messages not styled.
- **BUG**: Edit case: schedule not set correctly in view.
- **BUG**: Schedule not saved for monitoring case.

## V2.0-RC5

- **BUG**: Sample display: req shown as failed w/ unspecified checks.
- **BUG**: Edit case page not initialized correctly.
- **BUG**: Crash when retrieving more than one schedule.
- **BUG**: Supervisor was not set correctly for schedule.
- **BUG**: Cannot retrieve schedule from DB.
- **NEW**: Associate screenshots with failed check or external note.
- **NEW**: About: instructions for opening CSV with Excel.
- **NEW**: Protocol: failed req TOC per sample.
- **MOD**: Protocol: "Krav" changed to "Underkända krav" in TOC.
- **MOD**: Requirement view: changed labels, added placeholders for note fields.
- **MOD**: About: warning about excessive external remarks when monitoring.

## V2.0-RC4

- **NEW**: Documentation.
- **NEW**: Module tools can update checks.
- **BUG**: Case download failed. No warning of invalid case on upload [1].
- **NEW**: Contrast tool: empty output field receives focus = confusing [2].
- **NEW**: Glossary: 1.4.1 violation in grid menu? [2].
- **BUG**: Good/bad example type not conveyed to AT [2].
- **NEW**: Settings page: no feedback on save [2].
- **NEW**: Recall consent & delete function in settings page.
- **CONFIG**: Media player/film content types: see check for "on hover (resized)" but not "on hover" [2].
- **CONFIG**: Content type text: see checks for "on hover/focus (resized)" but not "on hover/focus" [2].
- **CONFIG**: Add 11.1.3.1.1 method: "Använd skärmläsare..." [1].
- **CONFIG**: Rename content type "Rörligt innehåll" to avoid confusion with film/animations [2].
- **CONFIG**: 5.5.1, 5.5.2: define "operable parts" [3].
- **CONFIG**: 5.7: add info on "key repetition" [3].
- **MOD**: Protocol: avoid "compliance" with metric or clarify [3].
- **CONFIG**: Change order between "Språk för textalternativ" and "Kontrast for textalternativ" [2].
- **CONFIG**: Remove precondition for "Ingen tangentbordsfälla" [2].
- **NEW**: About: clarify "interaktiva element" [2].
- **MOD**: About: add "change of user data" for "Radering av data" [1].
- **MOD**: About: clarify button checks not in "mediespelare" [1].
- **NEW**: Protocol: headings for expectations/observations [1].
- **NEW**: New sample: "save and return to audit" button [1].
- **NEW**: Protocol: clarify external note is not failure [1].
- **BUG R**: Removing a component does not delete references in samples.
- **BUG**: No error msg on doc download failure [3].
- **BUG**: Unchecked checks marked as approved when saved [1].
- **BUG**: Protocol/app: no content under Failures; wrong failure count [1].
- **CONFIG**: Screen, object-value logic fix [1].
- **BUG**: Adding content type "editor" doesn't populate requirements [1].
- **BUG**: Copy audit error on web address [1].
- **BUG**: Remarks: possessive form for PSB used throughout [1].
- **BUG**: Protocol TOC links broken due to id with space/'§' [1].
- **NEW**: Confirm when creating two remarks/injunctions same day.
- **CONFIG**: Remark typo "inte när det trycks net" [3].
- **MOD**: Manual: clarify "komponent" usage [3].
- **MOD**: Menu: "Tillsynskatalog" -> "Ärendekatalog" [3].
- **BUG**: Status msg says "<page> added" instead of "<page> saved" [3].
- **CONFIG**: Wrong observation for stmt-non-acc [2].
- **BUG**: 9.6 failed even if alt version specified [1].
- **BUG**: Derived check status error (1.2.3) [1].
- **BUG**: No case uniqueness validation [1].
- **BUG**: Edit log entry: empty audit dropdown [1].
- **BUG**: Protocol: type shown as "undefined" for components [1].
- **BUG**: Crash when auditing doc without format.
- **BUG**: 9.1.2.3 uses derived check referencing wrong configs.
- **BUG**: Remarks/injunction: action items should be numbered.
- **NEW**: Process note configurable in sample edit view.

## V2.0-RC3

- **NEW**: Support for CSV protocols.
- **BUG**: Document failures not shown in remarks.
- **BUG**: Documents not shown in protocol.
- **BUG**: Copying audit also copied remarks and injunctions.
- **BUG**: Copy audit should redirect to audit display, not sample edit.
- **BUG**: Could not generate protocols for apps.
- **BUG**: URL field visible when editing app screen samples.
- **NEW**: Modal on audit start about setting up directory structure (internal).
- **BUG**: Scroll into view did not work for return paths.
- **BUG**: Internal flag only worked via "Granska" button.
- **REFACT**: Common class for matching conditionals in requirement files.
- **BUG**: Non-public requirements added in generic cases.
- **NEW**: Navigation from last requirement goes to audit.
- **BUG**: Audit start/edit ignored case officer if not in DB.
- **BUG**: Audit start possible without officer or directory.
- **BUG**: Case creation possible without supervisor.
- **BUG**: Monitoring case selectable without schedule.
- **BUG**: Adding content type added requirements in wrong order.
- **BUG**: Audits vanished after saving case (schedule issue).
- **BUG**: Starting audit failed if case already open.
- **BUG**: Editing generic case showed internal fields for internal user.
- **REFACT**: Major dispatch loop simplification and fewer aggregated unit tests.
- **MDO**: Improved `ContentMenu` behavior.
- **BUG**: Adding sample with "more" did not clear fields or show feedback.
- **BUG**: Exception when copying Webpage without URL.
- **BUG**: Adding component reset content types to none (should default).

## V2.0-RC2

- **BUG**: Multiple checks unserialized incorrectly.
- **NEW**: Limited recovery on dispatcher failure.
- **BUG**: Component fields not hidden when editing a component.
- **BUG**: Components not properly added to a sample.
- **BUG**: Schedule not shown when editing monitoring case.
- **CONFIG**: Documents updates.
- **NEW**: `datetime` attribute for `<time>` elements in remarks/injunctions.
- **NEW**: Added support for remarks/injunctions.
- **BUG**: Checks page showed webpage checks regardless of type.
- **BUG**: No log entry when finishing audit.
- **BUG**: Observation missing for 9.6 (sub-check population error).
- **BUG**: Missing accessibility statement reported as OK in protocol.
- **BUG**: Metric styling missing in protocol summary.
- **MOD**: Updated About page with info on remarks/injunctions.
- **NEW**: Validate name uniqueness in sample edit view.
- **NEW**: Summary suggestions for certain log types.
- **NEW**: 410 pages for V1 monitoring pages.
- **NEW**: Prevent edit/delete of finished audits.
- **NEW**: Show app version in audit display view.
- **MOD**: Removed two-step remark info in monitoring process.
- **NEW**: Help pages for NVDA, VoiceOver, TalkBack, iOS/Android keyboard.

## V2.0-RC1

- **MOD**: Updated About page.
- **NEW**: Implemented audit finishing.
- **NEW**: Set sample type during selection.
- **NEW**: Filtering by OS or format in audit config.
- **NEW**: Set OS/format as class in requirement view.
- **NEW**: Format support for `NonWebDocument` and sample edit view.
- **NEW**: Added Oscillator tool module.
- **REFACT**: Added clause to `Requirement` for faster protocol view.
- **NEW**: Protocol template & config for apps.
- **BUG**: "Follows" list not populated in sample edit.
- **BUG**: Audit display view missing `aria-label` for sample icon.
- **BUG**: Null link for screen samples in audit display.
- **REFACT**: Replaced `ModalDialog` with `<dialog>`.
- **CONFIG**: Document configuration updates.
- **NEW**: Support for `figure`, `image` in audit config.
- **CONFIG**: App screen & component configuration updates.
- **MOD**: "Follows" affects sample order.
- **REFACT**: Separated model/view/controller from `AppContext`.
- **REFACT**: Nested form controls inside labels.
- **NEW**: Specify app version(s) at audit start.
- **NEW**: New "checks" page bypasses router/dispatcher.
- **REFACT**: Local storage improvements.
- **NEW**: Local storage consent feature.
- **NEW**: List components in protocol.
- **NEW**: TOC for components, pages, documents, failures.
- **NEW**: Protocol info per deficiency.
- **BUG**: Multiple WCAG SC requirements missed in protocol.
- **BUG**: External notes not displayed in protocol.
- **NEW**: Download button for protocols.
- **NEW**: Added sitemap.
- **BUG**: Derived checks not marked as done.
- **BUG**: Inaccessibility metric showed `NaN` in protocol.
- **STYLE**: No styling for SVG graphs in protocol.
- **STYLE**: No styling for description lists (print mode).
- **CONFIG**: Removed conditions from 11.7.

## V2.0-b3

- **NEW**: Re-audit: copy sample.
- **NEW**: Inaccessibility metric.
- **MOD**: Case numbers now support leading zeros.
- **MOD**: Edit sample: removed steps field, made URL optional, added "follows" dropdown to specify previous page.
- **BUG**: Debugged sample edit controller.
- **NEW**: First draft of protocol.
- **BUG**: Edit-proof audits and samples.
- **BUG**: Listbox styling in light mode (no focus marker; unclear interactivity).
- **BUG**: Audit start showed copy-from dropdown even for first audit.
- **MOD**: Error messages in status area not visible when scrolled near bottom.
- **BUG**: Audit start required two clicks, creating duplicate audits.
- **BUG**: Samples could not be renamed.
- **BUG**: Deleting component did not remove it from samples.
- **BUG**: Component content type dropdown showed "0 innehållstyper" despite "Text" being checked by default.
- **BUG**: Menus did not close properly.
- **BUG**: Requirement page: derived condition checks not displayed.
- **BUG**: 9.6 check: status did not update to "checked".
- **BUG**: Save-and-navigate set unset check status to "not failed".
- **MOD**: Arrow cursor for listbox.
- **MOD**: Audit process wording: "0 stickprov i kategorin" unclear.
- **MOD**: Requirement view: showed titles with prev/next buttons.
- **MOD**: Removed Save button from requirement view (confusing when editing).
- **TYPO**: Log entry typo: "Telefonsamntal".
- **TYPO**: "inte ha fler samtidiga ärenden i listan \*är absolut nödvändigt".
- **TYPO**: "tillräckligt att visa \*en en inmatningsmarkör".
- **STYLE**: Disabled button lacked styling.
- **STYLE**: Dark mode: `<kbd>` insufficient contrast ("Fokusordning").
- **STYLE**: Sad face icon too large in WAVE info.
- **CONFIG**: "Automatisk omladdning": clarified method to preserve log.
- **CONFIG**: "Rubriker": added image illustration and clarified h2+h3 validity.
- **CONFIG**: "Länkar": clarified long link text observation.
- **CONFIG**: "Kontrast för länkar": consolidated text contrast checks.
- **CONFIG**: "Kontrast för text": clarified font-weight and font-size checks.
- **CONFIG**: Removed keyboard navigation check for all interactive elements.
- **CONFIG**: "Kontrast för komponenter": highlighted exception as condition.
- **CONFIG**: Updated text alternative for audio description/transcription.
- **CONFIG**: Clarified "single connection" in simultaneous voice/text communication.

## V2.0-b2

- **NEW**: Audit list now shows audit progress.
- **NEW**: Finish audit removes empty categories.
- **BUG**: Edit sample updates requirements when content types change.
- **NEW**: Added tools: FontSize, SpacingProperties, FlashThreshold.
- **NEW**: Added accessibility statement requirements.
- **NEW**: Screenshot reminder at audit start.
- **MOD**: Tried accesskey for navigation buttons.
- **MOD**: Updated About page.
- **ADMIN**: Moved `menu.json` to `js/config/`.
