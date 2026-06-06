FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Run as an unprivileged user (P3-3). Pre-create the upload dir it must write to.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/uploads/vendor_docs \
    && chown -R appuser:appuser /app
USER appuser
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
