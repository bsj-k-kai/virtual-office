#!/usr/bin/env bash
# GitHub リポジトリ作成 & push（要: gh 認証 または GITHUB_TOKEN）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_NAME="${1:-virtual-office}"
GITHUB_USER="${GITHUB_USER:-bsj-k-kai}"
VISIBILITY="${VISIBILITY:-public}"

GH_BIN="${GH_BIN:-gh}"
if ! command -v "$GH_BIN" &>/dev/null; then
  if [ -x "$HOME/.local/bin/gh" ]; then
    GH_BIN="$HOME/.local/bin/gh"
  else
    echo "GitHub CLI (gh) が見つかりません。~/.local/bin/gh を用意するか brew install gh を実行してください。"
    exit 1
  fi
fi

auth_ok() {
  "$GH_BIN" auth status -h github.com &>/dev/null
}

if ! auth_ok; then
  if [ -n "${GITHUB_TOKEN:-${GH_TOKEN:-}}" ]; then
    echo "$GITHUB_TOKEN" | "$GH_BIN" auth login --with-token
  else
    echo "GitHub にログインしていません。次のいずれかを実行してください:"
    echo ""
    echo "  方法1) ブラウザでログイン:"
    echo "    $GH_BIN auth login -h github.com -p https -w"
    echo ""
    echo "  方法2) PAT を環境変数に設定:"
    echo "    export GITHUB_TOKEN='ghp_xxxx'"
    echo "    $0"
    exit 1
  fi
fi

if git remote get-url origin &>/dev/null; then
  echo "remote origin は既に設定済み: $(git remote get-url origin)"
else
  if "$GH_BIN" repo view "${GITHUB_USER}/${REPO_NAME}" &>/dev/null; then
    echo "リポジトリ ${GITHUB_USER}/${REPO_NAME} は既に存在します。"
  else
    echo "リポジトリ ${GITHUB_USER}/${REPO_NAME} を作成します..."
    "$GH_BIN" repo create "${REPO_NAME}" \
      --${VISIBILITY} \
      --source=. \
      --remote=origin \
      --description "バーチャルオフィス — 近接で気軽に話しかけられるリモートワーク空間" \
      --push
    exit 0
  fi
  git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git" 2>/dev/null || true
fi

echo "push します..."
git push -u origin main

echo ""
echo "完了: https://github.com/${GITHUB_USER}/${REPO_NAME}"
