#!/bin/sh
set -eu

INSTALL_DIR="${INSTALL_DIR:-${HOME}/.local/bin}"
RAW_BASE_URL="${RAW_BASE_URL:-https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main}"
COMMANDS="nutrient pdf-to-markdown pdf-to-text query"

LOCAL_BIN_DIR=""
TEMP_FILES=""
STAGED_TMP=""
PDF_TO_MARKDOWN_TMP=""
PDF_TO_TEXT_TMP=""
QUERY_TMP=""
NUTRIENT_TMP=""

case "$0" in
  */install.sh|install.sh)
    if [ -f "$0" ]; then
      SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
      LOCAL_BIN_DIR="$SCRIPT_DIR/bin"
    fi
    ;;
esac

cleanup() {
  if [ -n "$TEMP_FILES" ]; then
    printf '%s\n' "$TEMP_FILES" |
      while IFS= read -r temp_file; do
        if [ -n "$temp_file" ]; then
          rm -f "$temp_file"
        fi
      done
  fi
}

trap cleanup EXIT INT TERM HUP

track_temp() {
  if [ -z "$TEMP_FILES" ]; then
    TEMP_FILES="$1"
  else
    TEMP_FILES="${TEMP_FILES}
$1"
  fi
}

download() {
  url="$1"
  destination="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL \
      --proto '=https' \
      --proto-redir '=https' \
      --connect-timeout 5 \
      --max-time 30 \
      --retry 2 \
      "$url" -o "$destination"
    return 0
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q \
      --https-only \
      --timeout=30 \
      --tries=2 \
      -O "$destination" "$url"
    return 0
  fi

  echo "install.sh requires curl or wget" >&2
  exit 1
}

stage_command() {
  name="$1"
  STAGED_TMP="$(mktemp "$INSTALL_DIR/.${name}-install.XXXXXX")"
  track_temp "$STAGED_TMP"

  if [ -n "$LOCAL_BIN_DIR" ] && [ -f "$LOCAL_BIN_DIR/$name" ]; then
    cp "$LOCAL_BIN_DIR/$name" "$STAGED_TMP"
  else
    download "$RAW_BASE_URL/bin/$name" "$STAGED_TMP"
  fi

  chmod 0755 "$STAGED_TMP"
}

staged_path_for() {
  case "$1" in
    nutrient) printf '%s\n' "$NUTRIENT_TMP" ;;
    pdf-to-markdown) printf '%s\n' "$PDF_TO_MARKDOWN_TMP" ;;
    pdf-to-text) printf '%s\n' "$PDF_TO_TEXT_TMP" ;;
    query) printf '%s\n' "$QUERY_TMP" ;;
    *)
      printf 'Unknown command: %s\n' "$1" >&2
      return 1
      ;;
  esac
}

mkdir -p "$INSTALL_DIR"

for command_name in $COMMANDS; do
  stage_command "$command_name"

  case "$command_name" in
    nutrient) NUTRIENT_TMP="$STAGED_TMP" ;;
    pdf-to-markdown) PDF_TO_MARKDOWN_TMP="$STAGED_TMP" ;;
    pdf-to-text) PDF_TO_TEXT_TMP="$STAGED_TMP" ;;
    query) QUERY_TMP="$STAGED_TMP" ;;
  esac
done

for command_name in $COMMANDS; do
  staged_path="$(staged_path_for "$command_name")"
  target="$INSTALL_DIR/$command_name"
  mv "$staged_path" "$target"
  printf 'Installed %s to %s\n' "$command_name" "$target"
done

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    printf 'Add %s to PATH if it is not already available in your shell.\n' "$INSTALL_DIR"
    ;;
esac
