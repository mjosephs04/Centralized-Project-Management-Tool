FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV FLASK_APP=src.backend.app
ENV FLASK_ENV=development
ENV DATABASE_URL=mysql+pymysql://root:password@db:3306/todd

EXPOSE 8080

CMD ["python", "-m", "src.backend.app"]
