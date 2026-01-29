# Dashboard Testing Guide

## Quick Start

### 1. Start the Full Stack

```cmd
cd d:\REVOX_AI_WAF
.\start_waf.bat
```

This will start all services including the dashboard.

### 2. Access Dashboard

Open browser to: **http://localhost:3000**

You should see:
- ✅ Left sidebar with navigation
- ✅ Top stats bar
- ✅ Global attack map (empty until attacks)
- ✅ Top attacking IPs table
- ✅ Recent events table
- ✅ Right inspector panel (empty state)

### 3. Generate Test Traffic

Open simulator: **http://localhost:8080**

Click attack buttons:
- 💉 SQL Injection
- 🔥 XSS Attack
- 📁 Path Traversal
- 🌊 Traffic Flood

### 4. Observe Real-Time Updates

Watch the dashboard:

**Stats Bar** (top):
- Total Requests counter increases
- Blocked counter increases for attacks
- Live Feed indicator shows green

**Global Attack Map**:
- Animated arcs appear from attack source → Pune
- Hover over markers to see IP details
- Color indicates risk level

**Top Attacking IPs**:
- Table populates with simulator IP
- Request count increases
- Click "Propose Block" to blacklist

**Recent Events**:
- High-severity events appear in table
- Click any row to open inspector panel

**Inspector Panel** (right):
- Shows selected event details
- Payload syntax highlighted (red SQL keywords, orange XSS)
- Risk score displayed
- Model confidence chart appears

## Testing Checklist

### ✅ WebSocket Connection
- [ ] Green "Live Feed" indicator in stats bar
- [ ] Events appear within 1 second of attack
- [ ] No browser console errors

### ✅ Global Map
- [ ] World map renders correctly
- [ ] Target marker (Pune) pulsates
- [ ] Attack arcs animate smoothly
- [ ] Hover tooltips work
- [ ] Legend shows correctly

### ✅ Data Tables
- [ ] Tables populate with data
- [ ] Sorting works (if implemented)
- [ ] Row click selects event
- [ ] "Propose Block" sends API request

### ✅ Inspector Panel
- [ ] Shows empty state when nothing selected
- [ ] Populates when event clicked
- [ ] Payload highlighting works (SQL/XSS keywords in color)
- [ ] IP reputation card displays
- [ ] Model drift chart renders
- [ ] Close button works

### ✅ Performance
- [ ] Initial page load < 3 seconds
- [ ] No lag when clicking events
- [ ] WebSocket reconnects on disconnect
- [ ] Map animations smooth (60 FPS)

## Troubleshooting

### Dashboard Not Loading

**Check Docker:**
```cmd
docker ps | findstr dashboard
```

Should show `aegisx-dashboard` running.

**Check Logs:**
```cmd
docker logs aegisx-dashboard
```

### No Real-Time Updates

1. Check WebSocket connection in browser DevTools:
   - Open Network tab
   - Filter by WS
   - Should show `/ws` connection with green indicator

2. Check backend WebSocket:
```cmd
docker logs aegisx-waf-engine | findstr WebSocket
```

3. Check frontend console for errors

### Map Not Rendering

1. Check browser console for D3/geo errors
2. Verify `react-simple-maps` installed:
```cmd
cd dashboard
npm list react-simple-maps
```

### Empty Data

1. Generate traffic via simulator: http://localhost:8080
2. Check WAF engine is processing:
```cmd
docker logs aegisx-waf-engine
```

## Manual WebSocket Test

Open browser console on dashboard page:

```javascript
// Check connection
console.log('WebSocket URL:', 'ws://localhost:5000/ws');

// Manual connection test
const testWS = new WebSocket('ws://localhost:5000/ws');
testWS.onopen = () => console.log('✅ WebSocket connected!');
testWS.onmessage = (msg) => console.log('📨 Message:', JSON.parse(msg.data));
testWS.onerror = (err) => console.error('❌ Error:', err);
```

## Expected Behavior

### SQL Injection Attack Flow

1. **Simulator**: Click "💉 SQL Injection"
2. **WAF Engine**: Detects SQLi pattern, risk score > 80
3. **Dashboard Updates (< 1s)**:
   - Stats: Blocked +1
   - Map: New arc from simulator IP → Pune (orange)
   - Top IPs: Simulator IP count +1
   - Recent Events: New row with "BLOCK" badge
4. **Click Event Row**:
   - Inspector opens on right
   - Shows "SQL_INJECTION" attack type
   - Payload highlighted (SELECT, UNION, etc. in red)
   - Risk score 80-100
   - Action: BLOCK (red text)

### Legitimate Traffic Flow

1. **Simulator**: Click "✅ Legitimate Traffic"
2. **WAF Engine**: Low risk score < 30
3. **Dashboard Updates**:
   - Stats: Total +1, Allowed +1
   - Map: Green/blue arc
   - Recent Events: May not appear (low severity filter)

## Production Deployment

When deploying to staging/production:

1. Update WebSocket URL in `useSocketStore.ts`:
```typescript
const wsUrl = `wss://${window.location.hostname}/ws`; // Use WSS for HTTPS
```

2. Build optimized bundle:
```cmd
cd dashboard
npm run build
```

3. Serve via Nginx (already configured in Dockerfile)

4. Enable HTTPS for secure WebSocket (WSS)

## Performance Benchmarks

Expected metrics on modern hardware:

- **Dashboard Load**: 1-2 seconds
- **WebSocket Latency**: 50-100ms
- **Event Render**: < 50ms
- **Map Animation**: 60 FPS
- **Memory Usage**: ~100MB (React DevTools)
- **Bundle Size**: 500-800KB gzipped

---

**Dashboard Version**: 1.0.0  
**Last Updated**: January 2026
