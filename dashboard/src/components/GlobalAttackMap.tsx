import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from 'react-simple-maps';
import { useSocketStore } from '../store/useSocketStore';
import { motion } from 'framer-motion';
import { useState } from 'react';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Pune, India coordinates (target)
const TARGET_COORDS: [number, number] = [73.8567, 18.5204];

export default function GlobalAttackMap() {
    const { events } = useSocketStore();
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

    // Get last 10 blocked events for visualization
    const attackEvents = events
        .filter(e => e.action === 'BLOCK' && e.geo_lat !== 0 && e.geo_lon !== 0)
        .slice(0, 10);

    const handleMouseMove = (event: React.MouseEvent) => {
        if (tooltip) {
            setTooltip({ ...tooltip, x: event.clientX, y: event.clientY });
        }
    };

    return (
        <div
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
            onMouseMove={handleMouseMove}
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Global Attack Map</h2>
                <span className="text-sm text-gray-400">{attackEvents.length} active threats</span>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '400px', height: '50vh' }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 140,
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <ZoomableGroup center={[0, 0]} zoom={1}>
                        {/* World Map */}
                        <Geographies geography={geoUrl}>
                            {({ geographies }: any) =>
                                geographies.map((geo: any) => {
                                    const centroid = geo.geometry.type === 'Polygon'
                                        ? geo.geometry.coordinates[0].reduce((acc: [number, number], coord: [number, number]) =>
                                            [acc[0] + coord[0] / geo.geometry.coordinates[0].length, acc[1] + coord[1] / geo.geometry.coordinates[0].length],
                                            [0, 0])
                                        : geo.geometry.type === 'MultiPolygon'
                                            ? geo.geometry.coordinates[0][0].reduce((acc: [number, number], coord: [number, number]) =>
                                                [acc[0] + coord[0] / geo.geometry.coordinates[0][0].length, acc[1] + coord[1] / geo.geometry.coordinates[0][0].length],
                                                [0, 0])
                                            : [0, 0];

                                    return (
                                        <g key={geo.rsmKey}>
                                            <Geography
                                                geography={geo}
                                                fill="#1a1f2e"
                                                stroke="#2a2f3e"
                                                strokeWidth={0.5}
                                                style={{
                                                    default: { outline: 'none' },
                                                    hover: { outline: 'none', fill: '#242938' },
                                                    pressed: { outline: 'none' },
                                                }}
                                                onMouseEnter={(evt) => {
                                                    setTooltip({
                                                        content: geo.properties.name,
                                                        x: evt.clientX,
                                                        y: evt.clientY
                                                    });
                                                }}
                                                onMouseLeave={() => {
                                                    setTooltip(null);
                                                }}
                                            />
                                            {/* Country Label */}
                                            <Marker coordinates={centroid as [number, number]}>
                                                <text
                                                    textAnchor="middle"
                                                    className="text-[6px] fill-gray-500 font-medium pointer-events-none select-none"
                                                    style={{
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                                        letterSpacing: '0.5px'
                                                    }}
                                                >
                                                    {geo.properties.name}
                                                </text>
                                            </Marker>
                                        </g>
                                    );
                                })
                            }
                        </Geographies>

                        {/* Target Marker (Pune) */}
                        <Marker coordinates={TARGET_COORDS}>
                            <g>
                                <circle r={6} fill="#3b82f6" className="animate-pulse" />
                                <circle r={3} fill="#60a5fa" />
                            </g>
                        </Marker>

                        {/* Attack Sources and Arcs */}
                        {attackEvents.map((event, index) => {
                            const sourceCoords: [number, number] = [event.geo_lon, event.geo_lat];
                            const isHovered = hoveredEvent === event.id;
                            const isMostRecent = index === 0; // Most recent attack

                            // Calculate arrowhead position (80% along the line)
                            const arrowPos: [number, number] = [
                                sourceCoords[0] + (TARGET_COORDS[0] - sourceCoords[0]) * 0.8,
                                sourceCoords[1] + (TARGET_COORDS[1] - sourceCoords[1]) * 0.8
                            ];

                            // Calculate arrow direction
                            const dx = TARGET_COORDS[0] - sourceCoords[0];
                            const dy = TARGET_COORDS[1] - sourceCoords[1];
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                            return (
                                <g key={event.id}>
                                    <Line
                                        from={sourceCoords}
                                        to={TARGET_COORDS}
                                        stroke={event.risk_score > 80 ? '#f97316' : '#3b82f6'}
                                        strokeWidth={isMostRecent ? 3 : (isHovered ? 2 : 1.5)}
                                        strokeLinecap="round"
                                        strokeDasharray="5,5"
                                        style={{
                                            animation: isMostRecent
                                                ? `arc-draw 1.5s ease-in-out infinite`
                                                : `arc-draw 2s ease-in-out ${index * 0.2}s infinite`,
                                            opacity: isMostRecent ? 1 : (isHovered ? 1 : 0.6),
                                        }}
                                    />

                                    {/* Animated Arrowhead for most recent attack */}
                                    {isMostRecent && (
                                        <Marker coordinates={arrowPos}>
                                            <motion.g
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0.8, 1.2, 0.8] }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                style={{ transform: `rotate(${angle}deg)` }}
                                            >
                                                <path
                                                    d="M 0,-4 L 8,0 L 0,4 Z"
                                                    fill={event.risk_score > 80 ? '#f97316' : '#3b82f6'}
                                                    stroke="#1e293b"
                                                    strokeWidth={1}
                                                />
                                            </motion.g>
                                        </Marker>
                                    )}

                                    <Marker
                                        coordinates={sourceCoords}
                                        onMouseEnter={() => setHoveredEvent(event.id)}
                                        onMouseLeave={() => setHoveredEvent(null)}
                                    >
                                        <motion.g
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <circle
                                                r={5}
                                                fill={event.risk_score > 80 ? '#f97316' : '#3b82f6'}
                                                stroke="#1e293b"
                                                strokeWidth={2}
                                                className="cursor-pointer"
                                            />

                                            {/* City Label (Always visible for high risk) */}
                                            {(event.risk_score > 90 || isHovered) && (
                                                <text
                                                    textAnchor="middle"
                                                    y={-10}
                                                    className="text-[10px] fill-white font-bold"
                                                    style={{
                                                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {event.geo_city}
                                                </text>
                                            )}

                                            {isHovered && (
                                                <g style={{ pointerEvents: 'none' }}>
                                                    <rect
                                                        x={15}
                                                        y={-40}
                                                        width={160}
                                                        height={60}
                                                        fill="#0f172a"
                                                        stroke="#334155"
                                                        strokeWidth={1}
                                                        rx={6}
                                                        fillOpacity={0.95}
                                                    />
                                                    <text x={25} y={-20} fontSize={12} fill="#e2e8f0" fontWeight="bold">
                                                        {event.source_ip}
                                                    </text>
                                                    <text x={25} y={-4} fontSize={10} fill="#94a3b8">
                                                        {event.geo_city}, {event.country}
                                                    </text>
                                                    <text x={25} y={12} fontSize={10} fill={event.risk_score > 80 ? '#f87171' : '#60a5fa'}>
                                                        {event.attack_type || 'Suspicious Activity'}
                                                    </text>
                                                </g>
                                            )}
                                        </motion.g>
                                    </Marker>
                                </g>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>

                {/* Country Tooltip */}
                {tooltip && (
                    <div
                        className="fixed pointer-events-none bg-gray-900 border border-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg z-50 capitalize"
                        style={{
                            left: tooltip.x + 10,
                            top: tooltip.y - 30,
                        }}
                    >
                        {tooltip.content}
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 border border-gray-700 rounded-lg p-3 space-y-2 pointer-events-none">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Low Risk Attack</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">High Risk Attack</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-300">Target (Pune, IN)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
