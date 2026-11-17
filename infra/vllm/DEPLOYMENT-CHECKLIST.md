# ORCA GPU server deployment checklist

## Selected starting configuration

- Provider: RunPod
- Pod type: Secure Cloud
- GPU: 1 x NVIDIA L40S, 48 GB VRAM
- Runtime: Docker + NVIDIA Container Toolkit + vLLM
- Model: Qwen/Qwen3-8B
- API: vLLM chat completions at `/v1/chat/completions`
- Persistent model cache: host volume mounted at `/root/.cache/huggingface`

## Budget guardrail

RunPod currently lists L40S Secure Cloud at approximately USD 1.09/GPU-hour. At 730 hours this is about USD 795.70/month for the GPU alone. Storage, taxes, currency conversion and any additional services are extra. Re-check the live price and availability on the RunPod pricing page before clicking Deploy. Stop or terminate the Pod when it is not needed; a stopped Pod may still incur persistent storage charges.

## Provisioning steps in RunPod

1. Sign in to RunPod and add a payment method / spending limit.
2. Open Pods and select Secure Cloud.
3. Choose one L40S GPU (48 GB VRAM) in a region with suitable availability and acceptable latency to the Render API.
4. Select a CUDA-enabled PyTorch/Docker template with NVIDIA GPU access. Ensure Docker and NVIDIA Container Toolkit are available.
5. Allocate persistent storage for the model cache (start with 50 GB; expand if required).
6. Create the Pod. Do not expose SSH or inference ports to the whole internet unnecessarily.
7. Connect using the provider's documented SSH or terminal access.
8. Create a private `.env` file based on `.env.example`; generate a unique long random token. Never commit it to Git.
9. Run `bash run-orca-vllm.sh` from this directory.
10. Wait for Qwen3-8B weights to download and the vLLM engine to finish loading. Check `docker logs -f orca-vllm`.
11. Expose TCP/HTTP port 8000 using the provider's HTTPS proxy or a TLS reverse proxy. Keep bearer-token authentication enabled. Do not publish an unauthenticated inference endpoint.
12. Test `GET /v1/models` and a chat-completions request with the bearer token.

## Connect Render API

On Render service `orca-ai-api-qa-d9lu`, configure:

- `ORCA_MODEL_BASE_URL`: the GPU endpoint's HTTPS base URL ending in `/v1` (do not append `/chat/completions`)
- `ORCA_MODEL_NAME`: `Qwen/Qwen3-8B`
- `ORCA_MODEL_API_KEY`: the exact bearer token used by vLLM

The backend appends `/chat/completions` automatically. Never set these credentials in the frontend or a `NEXT_PUBLIC_*` variable.

Then redeploy the API and verify:

- `GET https://orca-ai-api-qa-d9lu.onrender.com/api/chat/models` returns `configured: true`.
- A test message receives a response from Qwen3-8B.
- API logs do not print the bearer token.

## Operational safeguards

- Set a monthly spend limit / budget alert in the GPU provider account.
- Monitor GPU utilization, VRAM, request latency, errors and token throughput.
- Use a private network or authenticated HTTPS endpoint. Restrict access to the API service where possible.
- Keep model cache and logs on persistent storage as appropriate; avoid storing sensitive prompts in plaintext logs.
- This is a single-GPU QA starting point, not a high-availability production design.
- Before production: load test, review model license and usage terms, add request limits, observability, access control, backups for app data, and a failover plan.
