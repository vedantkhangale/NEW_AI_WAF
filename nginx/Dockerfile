FROM openresty/openresty:alpine-fat

# Install additional modules
RUN apk add --no-cache \
    git \
    gcc \
    make \
    curl \
    luarocks \
    geoip-dev

# Install Lua dependencies
RUN luarocks install lua-resty-http
RUN luarocks install lua-cjson

# Install GeoIP2 module (compile from source)
WORKDIR /tmp
RUN git clone https://github.com/leev/ngx_http_geoip2_module.git

# Create directories
RUN mkdir -p /usr/local/openresty/nginx/lua
RUN mkdir -p /usr/local/geo ip

# Copy configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /usr/local/openresty/nginx/lua/

# Expose ports
EXPOSE 80 443

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
