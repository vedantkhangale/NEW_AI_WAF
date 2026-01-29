import { useEffect, useRef, useState } from 'react';

interface Attack {
    id: string;
    source_lat: number;
    source_lon: number;
    source_country: string;
    timestamp: number;
}

export default function AttackMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [attacks, setAttacks] = useState<Attack[]>([]);

    // Simulated attack data (replace with real API data later)
    useEffect(() => {
        const simulatedAttacks: Attack[] = [
            { id: '1', source_lat: 39.9042, source_lon: 116.4074, source_country: 'China', timestamp: Date.now() },
            { id: '2', source_lat: 55.7558, source_lon: 37.6173, source_country: 'Russia', timestamp: Date.now() },
            { id: '3', source_lat: 37.7749, source_lon: -122.4194, source_country: 'USA', timestamp: Date.now() },
            { id: '4', source_lat: -23.5505, source_lon: -46.6333, source_country: 'Brazil', timestamp: Date.now() },
        ];
        setAttacks(simulatedAttacks);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Your location (India)
        const targetLat = 28.6139;
        const targetLon = 77.2090;

        function latLonToXY(lat: number, lon: number) {
            const x = ((lon + 180) / 360) * width;
            const y = ((90 - lat) / 180) * height;
            return { x, y };
        }

        let animationFrame = 0;

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Draw world map outline (simplified)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);

            // Draw grid
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for (let i = 0; i < height; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
                ctx.stroke();
            }

            // Draw target (India)
            const target = latLonToXY(targetLat, targetLon);
            const targetPulse = Math.sin(animationFrame * 0.05) * 5 + 10;

            // Target glow
            const gradient = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, targetPulse);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(target.x, target.y, targetPulse, 0, Math.PI * 2);
            ctx.fill();

            // Target marker
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw attacks
            attacks.forEach((attack, index) => {
                const source = latLonToXY(attack.source_lat, attack.source_lon);

                // Attack source marker
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(source.x, source.y, 3, 0, Math.PI * 2);
                ctx.fill();

                // Animated arc
                const progress = ((animationFrame + index * 20) % 100) / 100;

                // Calculate control point for arc
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2 - 50;

                ctx.strokeStyle = `rgba(251, 146, 60, ${1 - progress})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);

                // Draw quadratic curve
                const currentX = source.x + (target.x - source.x) * progress;
                const currentY = source.y + (target.y - source.y) * progress - Math.sin(progress * Math.PI) * 50;

                ctx.lineTo(currentX, currentY);
                ctx.stroke();

                // Draw moving point
                ctx.fillStyle = '#fb923c';
                ctx.beginPath();
                ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                const glowGradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 10);
                glowGradient.addColorStop(0, 'rgba(251, 146, 60, 0.8)');
                glowGradient.addColorStop(1, 'rgba(251, 146, 60, 0)');
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(currentX, currentY, 10, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrame++;
            requestAnimationFrame(animate);
        }

        animate();
    }, [attacks]);

    return (
        <div className="relative w-full h-96 bg-slate-950 rounded-xl overflow-hidden">
            <canvas
                ref={canvasRef}
                width={1200}
                height={384}
                className="w-full h-full"
            />
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm border border-blue-500/30 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400">Active Attacks: <span className="text-orange-400 font-bold">{attacks.length}</span></p>
            </div>
        </div>
    );
}
