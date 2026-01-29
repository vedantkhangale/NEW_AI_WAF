FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    requests==2.31.0 \
    flask-cors==4.0.0

# Copy application
COPY . .

EXPOSE 8080

# Run simulator
# Run simulator
CMD ["python", "host_sim.py"]
