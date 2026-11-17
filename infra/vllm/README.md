# ORCA GPU inference server (vLLM)

This directory documents the first self-hosted inference deployment for ORCA AI. It runs an open-weight Qwen model on a GPU host that ORCA controls. It does not call OpenAI or another hosted inference API.

## Initial model profile

- Model: `Qwen/Qwen3-8B`
- Serving runtime: vLLM
- API contract: vLLM's OpenAI-compatible `/v1/chat/completions` endpoint
- Suggested starting hardware: a single NVIDIA GPU with 24 GB VRAM for a quantized/appropriately configured 8B deployment; use more VRAM for BF16, longer context, and higher concurrency. Validate the exact memory profile against the chosen vLLM version and model format before purchasing a host.

## Host prerequisites

- Linux server with NVIDIA GPU and working NVIDIA driver
- Docker Engine and NVIDIA Container Toolkit
- Persistent disk for model cache
- Private network connectivity from the Render API service to the inference host (VPN/private gateway recommended)
- Firewall allowing port 8000 only from the API service network
- TLS and authentication at a private reverse proxy or gateway if traffic crosses an untrusted network

## Run vLLM

Install Docker and NVIDIA Container Toolkit on the GPU host. Set a long random token in the host environment; do not commit it to Git:

```bash
export ORCA_MODEL_API_KEY='replace-with-a-long-random-secret'
mkdir -p "$HOME/.cache/huggingface"

docker run -d \
  --name orca-vllm \
  --restart unless-stopped \
  --gpus all \
  --ipc=host \
  -p 127.0.0.1:8000:8000 \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -e HF_HOME=/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen3-8B \
  --served-model-name Qwen/Qwen3-8B \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$ORCA_MODEL_API_KEY"
```

The example binds the container port to host loopback. Put a TLS reverse proxy/VPN/private network in front of it; do not expose port 8000 directly to the public internet. Pin a tested vLLM image tag or digest for production rather than relying on `latest`.

Check the model server locally:

```bash
curl -H "Authorization: Bearer $ORCA_MODEL_API_KEY" \
  http://127.0.0.1:8000/v1/models
```

## Configure the ORCA API on Render

Set these variables on the existing `orca-ai-api-qa-d9lu` service:

- `ORCA_MODEL_BASE_URL`: private/reverse-proxy base URL ending in `/v1`, for example `https://your-private-gateway.example/v1`
- `ORCA_MODEL_NAME`: `Qwen/Qwen3-8B`
- `ORCA_MODEL_API_KEY`: the same token configured for vLLM

The ORCA API appends `/chat/completions` to `ORCA_MODEL_BASE_URL`. Keep the token on the API service only. Never add it to the Next.js frontend or a `NEXT_PUBLIC_*` variable.

After saving the variables, redeploy the API. Confirm `GET /api/chat/models` reports `configured: true`, then send a chat request from the web app.

## Important deployment boundary

The Render free web services currently hosting the ORCA UI and API are not GPU inference hosts. This guide does not create or rent a GPU server. Select a GPU provider, region, pricing plan, and private networking method before provisioning compute. GPU instance charges, persistent storage, bandwidth, and idle time may be billable.
