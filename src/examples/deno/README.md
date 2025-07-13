# Deno Usage Example

```sh
deno task dev
```

```sh
deno task fmt
```

```sh
deno task lint
```

```sh
deno task check
```

## Expected output

```sh
deno task dev
Task dev deno run --allow-read --allow-write --allow-env --allow-net ./import_export.ts
--- Starting Penpot Import/Export Workflow ---

[1/2] Importing file: ./demo.penpot...
[OK] File imported successfully. New File ID: 5ddfd2fc-95bd-818a-8006-7c7b531f9ed5

[2/2] Exporting file with ID: 5ddfd2fc-95bd-818a-8006-7c7b531f9ed5...
[OK] Exported file saved to: ./exported_demo_1752428243271.penpot

[3/3] Attempting to export a non-existent file...

[OK] As expected, the export failed. The enhanced error log above should show the server's response.
  Programmatic Error Details: Status=404, Code=object-not-found

--- Workflow Completed ---
```
