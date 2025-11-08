FROM python:3.11-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV ENV=development

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system appuser && \
    adduser --system --ingroup appuser appuser

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ make \
    && rm -rf /var/lib/apt/lists/*

# Install uv + deps
COPY requirements.txt .
RUN pip install --no-cache-dir uv \
    && uv pip install -r requirements.txt --system --no-cache
# Copy application code
COPY app/ ./app/
COPY start.sh ./start.sh
COPY ./checkpoints_56_90h.ckpt ./checkpoints_56_90h.ckpt

RUN chmod +x start.sh && sed -i 's/\r$//' start.sh && chown appuser:appuser start.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

CMD ["/bin/bash", "-c", "exec ./start.sh"]
