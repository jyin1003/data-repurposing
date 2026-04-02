#!/bin/sh
# setup.sh
# --------
# Run once after cloning: sh setup.sh
# Generates papers-data.js and installs the git pre-commit hook.

set -e

echo ""
echo "Setting up research paper repo..."
echo ""

# 1. Generate initial papers-data.js
echo "→ Generating papers/papers-data.js..."
node generate-manifest.js

# 2. Install pre-commit hook
HOOK=".git/hooks/pre-commit"
if [ -d ".git/hooks" ]; then
  cat > "$HOOK" << 'HOOKEOF'
#!/bin/sh
# Validates all papers and regenerates papers-data.js before each commit.

echo ""
echo "Validating paper schemas..."
node "$(git rev-parse --show-toplevel)/validate.js"
if [ $? -ne 0 ]; then
  echo "Commit blocked: fix schema errors above and try again."
  echo "(To skip in an emergency: git commit --no-verify)"
  echo ""
  exit 1
fi

echo "Regenerating papers-data.js..."
node "$(git rev-parse --show-toplevel)/generate-manifest.js"
git add "$(git rev-parse --show-toplevel)/papers/papers-data.js"
exit 0
HOOKEOF
  chmod +x "$HOOK"
  echo "→ Installed git pre-commit hook"
else
  echo "⚠ .git/hooks not found — skipping hook install (not a git repo yet?)"
  echo "  Run 'git init' first, then re-run setup.sh"
fi

echo ""
echo "✓ Setup complete."
echo ""
echo "  To view the collection:"
echo "    Open index.html directly in any browser (no server needed)"
echo ""
echo "  To add a paper:"
echo "    1. Copy papers/_template.json → papers/your-paper-id.json"
echo "    2. Fill in the fields"
echo "    3. git add, commit  (validation + manifest rebuild runs automatically)"
echo ""
