FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Run as an unprivileged user (P3-3). UID 1001 matches the host owner of the
# bind-mounted /app/uploads (host: /home/t_burgernyc/uploads, owned by uid 1001),
# so the non-root process can still write vendor documents.
RUN useradd --create-home --uid 1001 appuser \
    && mkdir -p /app/uploads/vendor_docs \
    && chown -R appuser:appuser /app
USER appuser
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
