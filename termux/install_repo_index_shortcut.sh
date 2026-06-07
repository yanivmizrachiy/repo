#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SITE_URL="https://yanivmizrachiy.github.io/repo/"
SHORTCUT_DIR="$HOME/.shortcuts"
SHORTCUT_FILE="$SHORTCUT_DIR/🟧 הריפואים שלי"

mkdir -p "$SHORTCUT_DIR"

cat > "$SHORTCUT_FILE" <<'SHORTCUT'
#!/data/data/com.termux/files/usr/bin/bash
termux-open-url "https://yanivmizrachiy.github.io/repo/"
SHORTCUT

chmod +x "$SHORTCUT_FILE"

if command -v termux-toast >/dev/null 2>&1; then
  termux-toast "נוצר קיצור: 🟧 הריפואים שלי"
fi

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$SITE_URL"
fi

cat <<MSG
YANIV_REPO_SHORTCUT_OK
נוצר קיצור Termux:Widget בשם: 🟧 הריפואים שלי

כדי לשים אותו במסך הבית:
1. לחץ לחיצה ארוכה על מסך הבית.
2. בחר Widgets / ווידג׳טים.
3. בחר Termux:Widget.
4. בחר את הקיצור: 🟧 הריפואים שלי

האתר כבר מוכן גם כ-PWA עם צבע כתום:
$SITE_URL
MSG
