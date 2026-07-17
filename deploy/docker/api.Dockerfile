# SuperNote api — local/dev image (Bun)
# Build context: repository root
# Code is bind-mounted by docker-compose.dev.yml; image only caches deps layer.

FROM oven/bun:1.3.5

WORKDIR /workspace/api

# Install deps from lockfile for a warm layer; compose re-runs bun install on start.
COPY api/package.json api/bun.lock ./
RUN bun install

EXPOSE 20001

CMD ["bun", "run", "dev"]
