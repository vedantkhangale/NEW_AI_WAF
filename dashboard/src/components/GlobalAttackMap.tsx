import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import { useSocketStore } from '../store/useSocketStore';
import 'maplibre-gl/dist/maplibre-gl.css';

const TARGET_COORDS: [number, number] = [73.8567, 18.5204]; // Pune, India

const INITIAL_VIEW_STATE = {
    longitude: 20,
    latitude: 20,
    zoom: 1.5,
    pitch: 45,
    bearing: 0
};

// Free CartoDB Dark Matter tile
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function GlobalAttackMap() {
    const { events } = useSocketStore();

    // Use up to 100 recent Geo-located attacks for the MapLibre/DeckGL Beast performance map
    const attackEvents = useMemo(() => {
        return events
            .filter(e => e.action === 'BLOCK' && e.geo_lat !== 0 && e.geo_lon !== 0)
            .slice(0, 100);
    }, [events]);

    const layers = [
        new ArcLayer({
            id: 'attack-arcs',
            data: attackEvents,
            getSourcePosition: (d: any) => [d.geo_lon, d.geo_lat],
            getTargetPosition: () => TARGET_COORDS,
            getSourceColor: (d: any) => (d.risk_score ?? 0) > 80 ? [249, 115, 22, 200] : [59, 130, 246, 200], // Orange / Blue
            getTargetColor: [255, 255, 255, 250],
            getWidth: 2,
            getTilt: 15,
            pickable: true,
        }),

        new ScatterplotLayer({
            id: 'attack-sources',
            data: attackEvents,
            getPosition: (d: any) => [d.geo_lon, d.geo_lat],
            getFillColor: (d: any) => (d.risk_score ?? 0) > 80 ? [249, 115, 22] : [59, 130, 246],
            getRadius: 60000,
            radiusMinPixels: 4,
            radiusMaxPixels: 15,
            pickable: true,
        }),

        new ScatterplotLayer({
            id: 'target',
            data: [{ position: TARGET_COORDS }],
            getPosition: (d: any) => d.position,
            getFillColor: [59, 130, 246, 200],
            getRadius: 80000,
            radiusMinPixels: 6,
            radiusMaxPixels: 20,
        })
    ];

    const getTooltip = ({ object }: any) => {
        if (!object) return null;
        return {
            html: `
                <div style="padding: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: white; display: flex; flex-direction: column; gap: 4px; font-family: monospace;">
                    <strong style="color: #60a5fa">${object.source_ip}</strong>
                    <span>${object.city || 'Unknown'}, ${object.country || 'Unknown'}</span>
                    <span style="color: ${(object.risk_score ?? 0) > 80 ? '#f87171' : '#94a3b8'}">Risk: ${object.risk_score ?? 0}% - ${object.attack_type || 'Malicious'}</span>
                </div>
            `
        } as any;
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col h-[600px] relative">
            <div className="flex items-center justify-between mb-4 z-10 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Global Attack Map (MapLibre + Deck.gl)
                </h2>
                <span className="text-sm text-gray-400">{attackEvents.length} active threats</span>
            </div>

            <div className="relative rounded-lg overflow-hidden flex-1 border border-gray-700">
                <DeckGL
                    initialViewState={INITIAL_VIEW_STATE}
                    controller={true}
                    layers={layers}
                    getTooltip={getTooltip}
                >
                    <Map mapStyle={MAP_STYLE} />
                </DeckGL>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 space-y-2 pointer-events-none z-10">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">Basic Threat</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-xs text-gray-300">High Risk Threat</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        <span className="text-xs text-gray-300">Target (Pune, IN)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
