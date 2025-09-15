# Build + serve with Node
FROM node:20-alpine

WORKDIR /app

# Install deps
COPY src/frontend/package*.json ./
RUN npm ci

# Build
COPY src/frontend/ .
RUN npm run build

# Serve the static build
RUN npm i -g serve
ENV PORT=3000
EXPOSE 3000
# Use sh -c so $PORT expands
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
