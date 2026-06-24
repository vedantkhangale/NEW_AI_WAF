--[[
    AegisX WAF Interceptor - Lua
    
    Intercepts HTTP requests and sends to WAF engine for analysis
    Implements fail-open logic: if WAF unavailable, allow traffic
]]

local http = require "resty.http"
local cjson = require "cjson"

-- Configuration
local WAF_ENGINE_URL = os.getenv("WAF_ENGINE_URL") or "http://waf-engine:5000"
local WAF_TIMEOUT = 5000  -- 5 seconds
local FAIL_OPEN = true     -- Allow traffic if WAF fails

-- Helper function to read request body
local function read_body()
    ngx.req.read_body()
    local body = ngx.req.get_body_data()
    
    if not body then
        -- If body is in temp file
        local body_file = ngx.req.get_body_file()
        if body_file then
            local file = io.open(body_file, "r")
            if file then
                body = file:read("*all")
                file:close()
            end
        end
    end
    
    return body or ""
end

-- Extract request metadata
local function extract_metadata()
    local headers = ngx.req.get_headers()
    local uri = ngx.var.request_uri or ""
    local query_string = ngx.var.query_string or ""
    local method = ngx.req.get_method()
    local body = read_body()
    
    -- Use nginx-processed real IP (includes X-Forwarded-For if trusted)
    local source_ip = ngx.var.remote_addr
    
    -- Build headers dictionary
    local headers_dict = {}
    for k, v in pairs(headers) do
        if type(v) == "table" then
            headers_dict[k] = table.concat(v, ", ")
        else
            headers_dict[k] = tostring(v)
        end
    end
    
    return {
        source_ip = source_ip,
        method = method,
        uri = uri,
        query_string = query_string,
        headers = headers_dict,
        body = string.sub(body, 1, 10000)  -- Max 10KB
    }
end

-- Call WAF engine
local function analyze_request(metadata)
    local httpc = http.new()
    httpc:set_timeout(WAF_TIMEOUT)
    
    local res, err = httpc:request_uri(WAF_ENGINE_URL .. "/api/analyze_request", {
        method = "POST",
        body = cjson.encode(metadata),
        headers = {
            ["Content-Type"] = "application/json",
        },
        ssl_verify = false
    })
    
    if not res then
        ngx.log(ngx.ERR, "Failed to contact WAF engine: ", err)
        return nil, err
    end
    
    if res.status ~= 200 then
        ngx.log(ngx.ERR, "WAF engine returned status: ", res.status)
        return nil, "WAF engine error"
    end
    
    local decision = cjson.decode(res.body)
    return decision, nil
end

-- Main logic
local function main()
    -- Extract request data
    local metadata = extract_metadata()
    
    -- Call WAF engine
    local decision, err = analyze_request(metadata)
    
    if err then
        -- WAF engine failed
        if FAIL_OPEN then
            ngx.log(ngx.WARN, "WAF engine unavailable, allowing request (fail-open)")
            return  -- Allow request to proceed
        else
            -- Fail-closed: block all traffic
            ngx.status = 503
            ngx.header.content_type = "text/html"
            ngx.say([[
                <!DOCTYPE html>
                <html>
                <head><title>Service Unavailable</title></head>
                <body style="font-family: Arial; text-align: center; padding-top: 100px;">
                    <h1>503 Service Unavailable</h1>
                    <p>WAF engine is temporarily unavailable</p>
                </body>
                </html>
            ]])
            return ngx.exit(503)
        end
    end
    
    -- Process decision
    if decision.action == "BLOCKED" then
        -- Block request
        ngx.log(ngx.WARN, "Request BLOCKED: ", metadata.source_ip, " -> ", metadata.uri, 
                " (score: ", decision.risk_score, ", reason: ", decision.reason, ")")
        
        ngx.status = 403
        ngx.header.content_type = "text/html"
        ngx.say(string.format([[
            <!DOCTYPE html>
            <html>
            <head>
                <title>Access Denied - AegisX WAF</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #c31432 0%%, #240b36 100%%);
                        color: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: rgba(0, 0, 0, 0.5);
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    h1 { font-size: 64px; margin: 0; }
                    .icon { font-size: 100px; margin-bottom: 20px; }
                    p { font-size: 18px; margin: 10px 0; }
                    .detail { font-size: 14px; opacity: 0.7; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">🚫</div>
                    <h1>403 Forbidden</h1>
                    <p>Your request has been blocked by AegisX WAF</p>
                    <p><strong>Reason:</strong> %s</p>
                    <p><strong>Risk Score:</strong> %.2f</p>
                    <div class="detail">
                        <p>Request ID: %d</p>
                        <p>If you believe this is an error, please contact the administrator</p>
                    </div>
                </div>
            </body>
            </html>
        ]], decision.reason, decision.risk_score, decision.decision_id or 0))
        
        return ngx.exit(403)
        
    elseif decision.action == "PENDING" then
        -- Pending human review - allow for now but log
        ngx.log(ngx.INFO, "Request PENDING review: ", metadata.source_ip, " -> ", metadata.uri)
        -- Allow request to proceed
        
    else
        -- Allowed
        ngx.log(ngx.INFO, "Request ALLOWED: ", metadata.source_ip, " -> ", metadata.uri, 
                " (score: ", decision.risk_score, ")")
        -- Allow request to proceed
    end
end

-- Execute
local status, err = pcall(main)
if not status then
    ngx.log(ngx.ERR, "WAF interceptor error: ", err)
    if FAIL_OPEN then
        -- Allow request on error
        return
    else
        ngx.exit(500)
    end
end
