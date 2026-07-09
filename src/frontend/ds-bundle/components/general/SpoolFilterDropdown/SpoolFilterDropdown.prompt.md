SpoolFilterDropdown from web. Use via `window.SpoolHub.SpoolFilterDropdown` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Preview

```jsx
() => <SpoolFilterDropdown allMaterials={["PLA","PETG","ABS"]} allBrands={["Bambu Lab","eSUN","Prusa"]} allColors={[{"hex":"#1A7A52","name":"Jade Green"},{"hex":"#FFFFFF","name":"White"}]} filters={{"materials":[],"brands":[],"stockLevels":[],"colors":[],"activeOnly":false,"lowStockOnly":false,"archivedOnly":false,"neverScanned":false}} onChange={null} />
```
