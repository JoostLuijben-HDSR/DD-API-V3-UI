# Demo branch

This branch combines the work branches of this fork so the result can be tried out:

- `fix/unit-test-setup` – runnable unit tests
- `fix/datetime-seconds` – date filters with seconds
- `feature/export-all-pages-csv` – fetch all pages and download CSV
- `feature/result-table` – results as a sortable table
- `feature/filter-usability` – easier filters, Dutch Aquo names, period helper
- `feature/friendly-errors` – error messages with hints

The files in `demo/` and `.devcontainer/` are only for trying it out and are not part
of the pull requests.

## Try it in GitHub Codespaces

1. On GitHub, choose **Code > Codespaces > Create codespace on demo**.
2. Wait until the container is ready. `demo/run.sh` builds the app and starts it on
   port 8080; the browser tab opens by itself (or use the **Ports** tab).
3. Enter your own AquaDesk API key in the UI. The key is only sent to the server in
   your codespace, which passes it to AquaDesk.

Stop the codespace when you are done, so it does not use your free hours.

## Run it elsewhere

Requires .NET 8 SDK and Node.js 20:

```bash
bash demo/run.sh   # then open http://localhost:8080
```
