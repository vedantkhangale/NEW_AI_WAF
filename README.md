# AegisX WAF - AI-Powered Web Application Firewall

Production-grade Web Application Firewall with AI-powered threat detection, real-time visualization, and human-in-the-loop learning.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (Windows)
- 8GB RAM minimum
- 20GB free disk space
- MaxMind GeoLite2 database (instructions below)

### Installation

1. **Download GeoIP Database**
   - Visit https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   - Create free account
   - Download `GeoLite2-City.mmdb`
   - Place in `geoip/` folder

2. **Start AegisX WAF**
   ```cmd
   start_waf.bat
   ```

3. **Access Dashboard**
   - Open http://localhost:3000
   - View real-time attacks on world map
   - Monitor analytics in Wireshark-style interface

4. **Test with Simulator**
   - Open http://localhost:8080
   - Launch various attacks
   - Watch WAF block threats in real-time

5. **Stop AegisX WAF**
   ```cmd
   stop_waf.bat
   ```

## 🏗️ Architecture

```
┌─────────────────┐
│ Attack Simulator│
│   Port 8080     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│          AegisX WAF Stack                   │
│                                             │
│  OpenResty → WAF Engine → AI Service       │
│                ↓                            │
│           PostgreSQL + Redis                │
│                ↓                            │
│         React Dashboard                     │
└─────────────────────────────────────────────┘
```

### Components

- **OpenResty Proxy** (Port 80): Nginx + Lua for edge interception
- **WAF Engine** (Port 5000): FastAPI decision engine
- **AI Service** (Port 5001): LightGBM threat classifier
- **PostgreSQL** (Port 5432): Request logs and analytics
- **Redis** (Port 6379): IP reputation cache
- **Dashboard** (Port 3000): React SOC interface
- **Simulator** (Port 8080): Attack traffic generator

## 🎯 Features

### ✅ Real-Time Threat Detection
- SQL Injection detection
- XSS attack blocking
- Path traversal prevention
- SSRF protection
- < 50ms AI inference latency

### ✅ Visual Analytics
- Live world map with attack visualization
- Animated directional arrows from source to destination
- Real IP geolocation with MaxMind GeoIP2
- Wireshark-style request inspector

### ✅ Human-in-the-Loop Learning
- AI suggests actions (score-based)
- Human makes final decision
- Feedback loop for model improvement
- Automated retraining pipeline

### ✅ Production-Ready
- Docker Compose orchestration
- Health checks on all services
- Graceful fail-open on AI failure
- Redis caching for performance
- Rate limiting protection

## 📊 Dashboard Features

1. **Live Attack Map**
   - Real-time IP geolocation
   - Animated attack vectors
   - Color-coded by threat level

2. **Analytics Table**
   - Timestamp, IP, Method, Risk Score
   - Real-time WebSocket updates
   - Filterable and searchable

3. **Review Queue**
   - Human decision interface
   - See AI reasoning
   - Approve or block requests

4. **Statistics**
   - Total requests
   - Blocked vs allowed
   - Top attacking IPs
   - Attack type breakdown

## 🧪 Testing with Simulator

The attack simulator provides:

- **SQL Injection**: 50+ payloads
- **XSS Attacks**: Reflected, stored, DOM-based
- **Path Traversal**: Directory traversal attempts
- **SSRF**: Server-side request forgery
- **Legitimate Traffic**: Normal requests for baseline

## ⚙️ Configuration

Edit `.env` file to customize:

```env
# Server Location (for map visualization)
SERVER_LAT=18.5204
SERVER_LON=73.8567

# AI Thresholds
AI_THRESHOLD_LOW=0.3   # Below: Auto-allow
AI_THRESHOLD_HIGH=0.7  # Above: Auto-block

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

## 🔒 Security Features

- **Fail-Open Design**: Allows traffic if AI service is down
- **Rate Limiting**: Prevents DoS on AI service
- **Redis Authentication**: Secured cache access
- **PostgreSQL Security**: User isolation
- **No Raw Passwords**: Environment variable configuration

## 📖 API Endpoints

### WAF Engine (Port 5000)

- `POST /api/analyze_request` - Analyze incoming request
- `GET /api/requests` - Get request logs
- `POST /api/feedback` - Submit human decision
- `GET /api/stats` - Get statistics
- `WS /ws` - WebSocket for real-time updates

### AI Service (Port 5001)

- `POST /analyze` - Get risk score for request
- `POST /retrain` - Trigger model retraining
- `GET /health` - Health check

## 🛠️ Development

### View Logs
```cmd
docker-compose logs -f
```

### Restart Single Service
```cmd
docker-compose restart waf-engine
```

### Access Database
```cmd
docker-compose exec postgres psql -U waf_user -d aegisx_waf
```

### Access Redis
```cmd
docker-compose exec redis redis-cli -a redis_secure_2026
```

## 📈 Performance

- **Latency Overhead**: < 50ms p95
- **Throughput**: 1000+ req/s
- **Memory Usage**: ~2GB total
- **Disk Usage**: ~5GB (with logs)

## 🎓 Academic Use

This project demonstrates:
- Microservices architecture
- AI/ML integration in security
- Real-time data visualization
- Docker orchestration
- Human-in-the-loop systems
- Production-grade DevOps

## 📝 License

Educational/Academic use. Not for commercial deployment without security audit.

## 🤝 Contributing

This is a final year engineering project. Feedback and suggestions welcome!

## ⚠️ Important Notes

1. **Real IP Requirement**: For real-world map visualization, deploy simulator on different public IP (AWS/GCP/VPN)
2. **GeoIP Database**: Required for IP geolocation
3. **Resource Requirements**: 8GB RAM recommended
4. **Production Deployment**: Conduct security audit before production use

## 📞 Support

For issues or questions, check logs:
```cmd
docker-compose logs [service-name]
```

---

**Built with ❤️ for Computer Engineering Final Year Project**
