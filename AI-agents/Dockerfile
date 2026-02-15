FROM python:3.12-slim

# Prevent Python from writing .pyc and buffering logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (kept minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (better caching)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app /app/app
COPY data /app/data

# Create runtime dirs (uploads/extracted/index) inside container
RUN mkdir -p /app/data/uploads /app/data/uploads/_extracted /app/data/index

EXPOSE 8001

# Run API
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
