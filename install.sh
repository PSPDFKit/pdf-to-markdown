#!/bin/sh
set -eu

INSTALL_DIR="${INSTALL_DIR:-${HOME}/.local/bin}"
RAW_BASE_URL="${RAW_BASE_URL:-https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main}"
TARGET="$INSTALL_DIR/pdf-to-markdown"
TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/pdf-to-markdown-install.XXXXXX")"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

cleanup() {
  rm -f "$TMP_FILE"
}

trap cleanup EXIT INT TERM HUP

download() {
  url="$1"
  destination="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$destination"
    return 0
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q -O "$destination" "$url"
    return 0
  fi

  echo "install.sh requires curl or wget" >&2
  exit 1
}

mkdir -p "$INSTALL_DIR"

if [ -f "$SCRIPT_DIR/bin/pdf-to-markdown" ]; then
  cp "$SCRIPT_DIR/bin/pdf-to-markdown" "$TMP_FILE"
else
  download "$RAW_BASE_URL/bin/pdf-to-markdown" "$TMP_FILE"
fi

chmod 0755 "$TMP_FILE"
mv "$TMP_FILE" "$TARGET"

printf 'Installed pdf-to-markdown to %s\n' "$TARGET"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    printf 'Add %s to PATH if it is not already available in your shell.\n' "$INSTALL_DIR"
    ;;
esac
