#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "[seed-dev-data] curl コマンドが見つかりません。"
  exit 1
fi

read_env_value() {
  local key="$1"
  local fallback="$2"
  local file=".env"
  if [ ! -f "$file" ]; then
    printf '%s' "$fallback"
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    printf '%s' "$fallback"
    return 0
  fi
  printf '%s' "${line#*=}" | tr -d '\r'
}

COUNT="${1:-120}"
if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
  echo "[seed-dev-data] 1つ目の引数は数値（投入件数）を指定してください。"
  exit 1
fi

if [ "$COUNT" -le 0 ]; then
  echo "[seed-dev-data] 投入件数は1以上を指定してください。"
  exit 1
fi

BACKEND_PORT="$(read_env_value BACKEND_HOST_PORT 18080)"
AUTH_MODE="$(read_env_value AUTH_MODE none)"
AUTH_PROXY_USER_HEADER="$(read_env_value AUTH_PROXY_USER_HEADER X-Forwarded-User)"
AUTH_PROXY_EMAIL_HEADER="$(read_env_value AUTH_PROXY_EMAIL_HEADER X-Forwarded-Email)"
AUTH_DEV_USER_ID="$(read_env_value AUTH_DEV_USER_ID local-dev)"
AUTH_DEV_USER_EMAIL="$(read_env_value AUTH_DEV_USER_EMAIL local@example.com)"
SEED_PREFIX="$(read_env_value DEV_SEED_PREFIX Dev検証企業)"
BATCH_TAG="$(date +%Y%m%d%H%M%S)"

headers=()
if [ "$AUTH_MODE" = "proxy_header" ]; then
  headers+=(-H "${AUTH_PROXY_USER_HEADER}: ${AUTH_DEV_USER_ID}")
  if [ -n "$AUTH_DEV_USER_EMAIL" ]; then
    headers+=(-H "${AUTH_PROXY_EMAIL_HEADER}: ${AUTH_DEV_USER_EMAIL}")
  fi
fi

detect_api_base() {
  local host
  for host in localhost 127.0.0.1 host.docker.internal; do
    if curl -fsS "${headers[@]}" "http://${host}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
      printf '%s' "http://${host}:${BACKEND_PORT}"
      return 0
    fi
  done
  return 1
}

BASE_URL="$(detect_api_base || true)"
if [ -z "$BASE_URL" ]; then
  echo "[seed-dev-data] APIに接続できません: localhost/127.0.0.1/host.docker.internal:${BACKEND_PORT}"
  echo "  先に ./scripts/gui-up.sh を実行してください。"
  exit 1
fi

company_status_for_index() {
  local index="$1"
  case $(( (index - 1) % 5 )) in
    0) echo "未着手" ;;
    1) echo "選考中" ;;
    2) echo "内定" ;;
    3) echo "お見送り" ;;
    *) echo "辞退" ;;
  esac
}

interview_status_for_company_status() {
  local company_status="$1"
  case "$company_status" in
    "未着手") echo "未着手" ;;
    "選考中") echo "予定" ;;
    "内定") echo "通過" ;;
    "お見送り") echo "不通過" ;;
    *) echo "辞退" ;;
  esac
}

printf '[seed-dev-data] Devアカウントへテストデータ投入を開始します\n'
printf '  user: %s\n' "$AUTH_DEV_USER_ID"
printf '  mode: %s\n' "$AUTH_MODE"
printf '  count: %s\n' "$COUNT"
printf '  batch: %s\n' "$BATCH_TAG"

inserted=0

for i in $(seq 1 "$COUNT"); do
  company_name="$(printf '%s-%s-%03d' "$SEED_PREFIX" "$BATCH_TAG" "$i")"
  company_status="$(company_status_for_index "$i")"
  interview_status="$(interview_status_for_company_status "$company_status")"

  base_offset="$(( (i % 75) - 30 ))"
  entry_date="$(date -u -d "${base_offset} days" +%F)"
  es_date="$(date -u -d "$((base_offset + 4)) days" +%F)"
  web_date="$(date -u -d "$((base_offset + 9)) days" +%F)"
  gd_date="$(date -u -d "$((base_offset + 13)) days" +%F)"
  interview_date="$(date -u -d "$((base_offset + 20)) days" +%F)"

  web_scheduled="$web_date"
  gd_scheduled="$gd_date"
  interview_scheduled="$interview_date"

  if [ $((i % 4)) -eq 0 ]; then
    web_scheduled=""
  fi
  if [ $((i % 5)) -eq 0 ]; then
    gd_scheduled=""
  fi
  if [ $((i % 6)) -eq 0 ]; then
    interview_scheduled=""
  fi

  payload="$(cat <<EOF
{
  "name": "${company_name}",
  "mypageLink": "https://example.com/mypage/${BATCH_TAG}/${i}",
  "mypageId": "dev-${BATCH_TAG}-${i}",
  "selectionStatus": "${company_status}",
  "selectionSteps": [
    {
      "kind": "エントリー",
      "title": "エントリー",
      "status": "実施済",
      "scheduledAt": "${entry_date}"
    },
    {
      "kind": "ES",
      "title": "ES提出",
      "status": "通過",
      "scheduledAt": "${es_date}"
    },
    {
      "kind": "Webテスト",
      "title": "Webテスト",
      "status": "実施済",
      "scheduledAt": "${web_scheduled}"
    },
    {
      "kind": "GD",
      "title": "グループディスカッション",
      "status": "予定",
      "scheduledAt": "${gd_scheduled}"
    },
    {
      "kind": "面接",
      "title": "一次面接",
      "status": "${interview_status}",
      "scheduledAt": "${interview_scheduled}"
    }
  ],
  "esContent": "【テストデータ】${company_name} のES下書き",
  "researchContent": "【テストデータ】${company_name} の企業研究メモ"
}
EOF
)"

  curl -fsS \
    -X POST \
    -H "Content-Type: application/json" \
    "${headers[@]}" \
    --data "$payload" \
    "${BASE_URL}/companies" >/dev/null

  inserted=$((inserted + 1))
  if [ $((i % 20)) -eq 0 ] || [ "$i" -eq "$COUNT" ]; then
    printf '[seed-dev-data] 進捗: %d / %d\n' "$i" "$COUNT"
  fi
done

seeded_count="$(
  curl -fsS "${headers[@]}" "${BASE_URL}/companies?q=${SEED_PREFIX}-${BATCH_TAG}" \
    | grep -o "\"name\":\"${SEED_PREFIX}-${BATCH_TAG}-[0-9][0-9][0-9]\"" \
    | wc -l \
    | tr -d '[:space:]'
)"

echo
echo "[seed-dev-data] 完了"
echo "  挿入件数: ${inserted}"
echo "  検索用キーワード: ${SEED_PREFIX}-${BATCH_TAG}"
echo "  API確認: ${BASE_URL}/companies?q=${SEED_PREFIX}-${BATCH_TAG}"
echo "  実測件数: ${seeded_count}"
