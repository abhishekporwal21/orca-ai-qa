#!/usr/bin/env bash
set -euo pipefail

: "${ORCA_MODEL_API_KEY:?Set ORCA_MODEL_API_KEY to a long random token}"
MODEL="${ORCA_MODEL_NAME:-Qwen/Qwen3-8B}"
IMAGE="${VLLM_IMAGE:-vllm/vllm-openai:latest}"
HF_CACHE="${HF_CACHE:-$HOME/.cache/huggingface}"

mkdir -p "$HF_CACHE"

# Keep the container restartable and persist the downloaded model cache.
docker rm -f orca-vllm >/dev/null 2>&1 || true
docker run -d \
  --name orca-vllm \
  --restart unless-stopped \
  --gpus all \
  --ipc=host \
  -p 8000:8000 \
  -v "$HF_CACHE:/root/.cache/huggingface" \
  -e HF_HOME=/root/.cache/huggingface \
  "$IMAGE" \
  --model "$MODEL" \
  --served-model-name "$MODEL" \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$ORCA_MODEL_API_KEY"

echo "Started ORCA model server container. Check: docker logs -f orca-vllm"
echo "Configure ORCA_MODEL_BASE_URL to the HTTPS base URL ending in /v1."
