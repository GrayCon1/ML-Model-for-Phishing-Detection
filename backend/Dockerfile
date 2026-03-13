# ── Stage 1: builder ─────────────────────────────────────────────────────────
# Installs all Python packages (including those that require compilation) into
# an isolated virtual environment.  Build tools never reach the final image.
FROM python:3.11-slim AS builder

# gcc / g++ are required to compile native C extensions (e.g. scipy, which is a
# transitive dependency of scikit-learn) when a pre-built wheel is unavailable
# for the target platform.  They are discarded after this stage.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Create the virtual environment that will be copied to the runtime stage.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# Lean production image.  No compiler, no build artefacts, no root process.
FROM python:3.11-slim AS runtime

# Prevent Python from writing .pyc files and buffer stdout/stderr so logs
# reach the container runtime immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH"

# Copy only the pre-built virtual environment — no compiler lands here.
COPY --from=builder /opt/venv /opt/venv

# Dedicated non-root system account.
# --no-create-home  : no writable home directory
# --shell /sbin/nologin : no interactive shell login possible
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --no-create-home --shell /sbin/nologin appuser

WORKDIR /app

# Copy only the files needed at runtime.  train/ and other dev artefacts are
# intentionally excluded to reduce the image surface.
COPY --chown=appuser:appgroup app/   ./app/
COPY --chown=appuser:appgroup model/ ./model/

USER appuser

EXPOSE 8000

# `exec` replaces the shell so uvicorn is PID 1 and receives SIGTERM directly,
# enabling graceful shutdown.  ${PORT:-8000} honours the PORT variable injected
# by Render and Railway without requiring a hard-coded value here.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
