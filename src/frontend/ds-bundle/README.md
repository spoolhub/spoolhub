# SpoolHub (web@0.0.0)

This design system is the published web React library, bundled as a single
browser global. All 51 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.SpoolHub`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` + `_ds_bundle.css` — link both. `styles.css` carries tokens and fonts; `_ds_bundle.css` carries component styles.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these three lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="_ds_bundle.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.SpoolHub.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { ActiveSpoolIcon } = window.SpoolHub;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<ActiveSpoolIcon />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<PreviewProvider>{children}</PreviewProvider>
```

## Tokens

0 CSS custom properties from web. Names are
preserved verbatim from upstream. See `tokens/` for the full list.



## Components

### icons
- `ActiveSpoolIcon`
- `FilamentIcon`
- `InfoCircleIcon`
- `InfoIcon`
- `LockIcon`
- `NfcIcon`
- `PenIcon`
- `PrinterIcon`
- `ReloadIcon`
- `SpoolHubLogo`
- `SpoolIcon`
- `SpoolOutlineIcon`
- `UpdatesIcon`
- `UsbOffIcon`

### general
- `ActivityCard`
- `AddBrandModal`
- `AddPrinterModal`
- `AddSpoolForm`
- `AddSpoolProfileModal`
- `AmsConflictModal`
- `BrandCard`
- `BrandFilterBar`
- `DarkModeToggle`
- `FilamentCard`
- `FilamentFilterDropdown`
- `Header`
- `LanguageSelector`
- `LowStockSpools`
- `MaterialTag`
- `MetricCard`
- `NfcScanModal`
- `Pagination`
- `PrinterPicker`
- `RecentActivity`
- `ScanView`
- `Sidebar`
- `SpoolCard`
- `SpoolDetail`
- `SpoolDetailsForm`
- `SpoolEditor`
- `SpoolFilterDropdown`
- `SpoolSearchBar`
- `StatusRing`
- `UnassignedTagPanel`

### scan
- `AndroidScanner`
- `DesktopScanner`
- `IphoneScanner`
- `ScanResult`
- `SpoolScanPopup`

### brandcard
- `BrandLogo`

### printhistory
- `PrintHistoryList`
