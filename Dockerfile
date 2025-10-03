FROM python:3.11-slim-bullseye AS builder

# Set env
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ make \
    && rm -rf /var/lib/apt/lists/*

# Install uv + deps
COPY requirements.txt .
RUN pip install --no-cache-dir uv \
    && uv pip install -r requirements.txt --system --no-cache

# Final stage
FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Create non-root user
RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

# Copy only installed packages from builder
COPY --from=builder /usr/local /usr/local

# Copy app source
COPY . .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app"]
