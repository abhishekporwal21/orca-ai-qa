# ORCA AI QA checklist — release 0.1.0

- [ ] PostgreSQL container starts and reports healthy.
- [ ] Prisma client generates successfully.
- [ ] Initial database migration completes.
- [ ] API starts on port 4000.
- [ ] `GET /health` returns HTTP 200.
- [ ] Web app starts on port 3000.
- [ ] Chat request returns an assistant response with a configured API key.
- [ ] Conversation appears in sidebar.
- [ ] Conversation and messages survive page refresh.
- [ ] Invalid/empty messages are rejected by validation.
- [ ] Missing provider key returns a clear service-unavailable response.
- [ ] CORS permits configured QA frontend origin only.
- [ ] Before shared QA: replace demo identity with real authentication and add rate limiting.
