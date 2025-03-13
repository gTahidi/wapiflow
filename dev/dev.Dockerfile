# Multi-stage build
FROM golang:1.22 AS go

FROM node:18 AS node

# Copy Go from the go stage
COPY --from=go /usr/local/go /usr/local/go
ENV GOPATH /go
ENV CGO_ENABLED=0
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH

# Install Atlas with proper PATH setup
RUN curl -sSf https://atlasgo.sh | sh && \
    echo 'export PATH="/root/.atlas/bin:$PATH"' >> /root/.bashrc

# Install PNPM globally
RUN npm install -g pnpm@9.1.0

# Create app directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

# Source bashrc to ensure Atlas is in PATH
SHELL ["/bin/bash", "-c"]
CMD ["source", "/root/.bashrc", "&&", "sleep", "infinity"]