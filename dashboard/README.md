# AegisX Dashboard

Production-ready React dashboard for the AegisX Web Application Firewall.

## Features

### Real-Time Monitoring
- **Live Attack Map**: Global visualization with animated arcs showing attack origins → Pune, India
- **WebSocket Integration**: Sub-second updates via Zustand store
- **Stats Dashboard**: Total requests, blocked threats, unique IPs

### Data Tables
- **Top Attacking IPs**: Sortable table with "Propose Block" functionality
- **Recent Events**: Click any row to view full details in inspector panel
- **Risk Visualization**: Color-coded progress bars and badges

### Inspector Panel
- **Decision Explanation**: Full event breakdown with timestamps
- **Syntax-Highlighted Payloads**: Automatic highlighting of SQL/XSS patterns
- **IP Reputation Card**: Risk scores, geolocation, tags
- **Model Drift Monitor**: Rea-time confidence chart with drift detection

## Tech Stack

- **Vite** - Lightning-fast build tool
- **React 18** + **TypeScript** - Type-safe components
- **Tailwind CSS** - Utility-first styling with custom dark theme
- **Zustand** - Lightweight state management
- **react-simple-maps** - SVG-based world map with D3 geo projections
- **Recharts** - Responsive charts for drift monitoring
- **Framer Motion** - Smooth animations
- **Lucide React** - Modern icon library

## Development

### Local Development

```bash
cd dashboard
npm install
npm run dev
```

Dashboard will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

### Environment Variables

The dashboard connects to the WAF engine via proxy configured in `vite.config.ts`:

```typescript
proxy: {
  '/api': 'http://waf-engine:5000',
  '/ws': 'ws://waf-engine:5000',
}
```

## Docker Deployment

The dashboard is automatically deployed with the full AegisX stack:

```bash
docker-compose up -d dashboard
```

Access at: `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Sidebar.tsx              # Left navigation
│   ├── StatsBar.tsx             # Top metrics bar
│   ├── GlobalAttackMap.tsx      # World map with attack arcs
│   ├── TopAttackingIPs.tsx      # IP aggregation table
│   ├── RecentEvents.tsx         # High-severity events
│   └── InspectorPanel.tsx       # Right-side event details
├── store/
│   └── useSocketStore.ts        # Zustand + WebSocket
├── types/
│   └── index.ts                 # TypeScript interfaces
├── App.tsx                      # Main layout
├── main.tsx                     # React entry
└── index.css                    # Tailwind + custom styles
```

## Key Components

### GlobalAttackMap
- Uses `react-simple-maps` with GeoMercator projection
- Animated SVG arcs with `strokeDasharray` animation
- Hover tooltips showing IP, city, risk score
- Color-coded by threat level (blue: low, orange: high)

### InspectorPanel
- Syntax highlighting for SQL injection and XSS payloads
- Recharts AreaChart for model confidence over time
- ReferenceDot for drift detection markers
- Responsive layout with sticky header

### WebSocket Store
- Auto-reconnect on disconnect (3s delay)
- Converts backend format to frontend AttackEvent interface
- Maintains last 100 events, 20 model metrics
- Real-time aggregation for top IPs

## Customization

### Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  'aegis-dark': { ... },
  'aegis-blue': { ... },
  'aegis-orange': '#f97316',
}
```

### Target Location

Update coordinates in `GlobalAttackMap.tsx`:

```typescript
const TARGET_COORDS: [number, number] = [73.8567, 18.5204]; // [lon, lat]
```

### WebSocket URL

Modify in `useSocketStore.ts`:

```typescript
const wsUrl = `ws://${window.location.hostname}:5000/ws`;
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance

- **Initial Load**: < 2s (optimized build)
- **WebSocket Latency**: < 100ms
- **Re-render Time**: < 16ms (60 FPS)
- **Build Size**: ~500KB gzipped

## License

Built for Final Year Project - AegisX WAF System
