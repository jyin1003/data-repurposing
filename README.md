# Research Paper Collection

A git-native research paper repository with a browser viewer, schema validation, and side-by-side comparison.

## Repo structure

```
├── index.html               ← open this to browse and compare papers
├── validate.js              ← schema validator (runs before every commit)
├── generate-manifest.js     ← rebuilds papers/papers-data.js
├── setup.sh                 ← run once after cloning
├── papers/
│   ├── _template.json       ← copy this when adding a new paper
│   ├── papers-data.js       ← auto-generated, DO NOT edit by hand
│   ├── attention-is-all-you-need.json
│   └── ...json (papers)
```

---

## Prerequisites — installing Node.js

The scripts (`validate.js`, `generate-manifest.js`, `setup.sh`) require **Node.js**.
You only need to do this once per machine.

### macOS

**Option A — recommended (via Homebrew):**
```sh
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node
```

**Option B — official installer:**
Download and run the macOS installer from https://nodejs.org (choose the "LTS" version).

Verify it worked:
```sh
node --version   # should print e.g. v22.x.x
```

### Windows

Download and run the Windows installer from https://nodejs.org (choose "LTS").

During install, leave all defaults as-is. Once done, open **Command Prompt** or **PowerShell** and verify:
```sh
node --version
```

> On Windows, replace `sh setup.sh` with `node generate-manifest.js` and
> `node validate.js` run directly — the shell script requires Git Bash or WSL
> (see below). Everything else works identically.

**Optional — Git Bash (lets you run `sh setup.sh` and the git hook on Windows):**
Install Git for Windows from https://git-scm.com/download/win — it includes Git Bash.

### Linux

```sh
# Ubuntu / Debian
sudo apt update && sudo apt install nodejs

# Fedora / RHEL
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs
```

Verify:
```sh
node --version
```

---

## Getting started

```sh
git clone <your-repo-url>
cd <repo>
sh setup.sh      # installs git pre-commit hook + generates papers-data.js
```

Then open `index.html` directly in any browser — no server needed.

## Adding a paper

1. Copy the template:
   ```sh
   cp papers/_template.json papers/your-paper-id.json
   ```

2. Fill in the fields (see schema below).

3. Commit — validation and manifest rebuild run automatically:
   ```sh
   git add papers/your-paper-id.json
   git commit -m "add: Your Paper Title"
   ```

   If the schema is invalid, the commit will be blocked with a clear error message.

   To skip the hook in an emergency:
   ```sh
   git commit --no-verify -m "..."
   ```

4. If you ever need to rebuild `papers-data.js` manually (e.g. after resolving a merge conflict):
   ```sh
   node generate-manifest.js
   ```

## Paper schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✓ | Lowercase letters, numbers, hyphens. Must match filename. |
| `title` | string | ✓ | Full paper title. |
| `authors` | string[] | — | Array of author strings e.g. `"Last, F."` |
| `year` | number | — | Publication year. |
| `dataset_type` | string[] | — | Lowercase tags for filtering based on the type of datasets. |
| `link` | string | — | Must start with `http://` or `https://` |
| `dataset_schema` | labeled_array | — | The dataset/s being repurposed and their schema/s. |
| `original_intent` | labeled_array | — | The original intent of the dataset/s. |
| `repurposed_use` | string | — | What is the new purpose. |
| `limitations` | labeled_array | — | What are the limitations from repurposing the data. |
| `transformations` | labeled_array | — | Key equations, architectures, or methods. |
| `notes` | string | — | Related work, personal observations. |

### How To Edit Fields
You can add **custom fields** freely — the validator will warn but not block on unknown fields.

Typical workflow for a new field

1. Add the key to `papers/_template.json` so future papers include it by default
2. Add it to `SCHEMA.fields` in `validate.js`
3. Add it to `FIELDS` in `index.html`
4. Backfill it into existing paper JSONs as needed

Available options per field:
| Option                          | What it does                                      |
|--------------------------------|--------------------------------------------------|
| `type: 'string'`               | Validates it's a string                          |
| `type: 'number'`               | Validates it's a number                          |
| `type: 'array', items: 'string'` | Validates it's an array of strings               |
| `required: true`               | Blocks commit if field is missing                |
| `pattern: /regex/`             | Validates string format                          |
| `hint: '...'`                  | Message shown when pattern fails                 |
| `min / max`                    | Range check for numbers                          |

## Running validation manually

```sh
node validate.js
```

Exit 0 = all valid. Exit 1 = errors found.

## Viewing the Repo

1. Run node `generate-manifest.js` - this will update `papers/manifest.json` if you have addedd new papers
2. Open `index.html` locally in your (VSC) IDE


## Viewer features

- **Search** — searches titles, authors, tags, and all text fields
- **Filter** — click any tag to filter the collection including `dataset_type`, `limitations` and `transformations`. Note this is an 'OR' filter which will return papers that match ANY of the filters
- **Sort** — by year (newest/oldest) or title
- **Expand** — click a card to reveal all sections