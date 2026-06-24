import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// ─── Cyber Particle Background ──────────────────────────────────────────────
function CyberBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let particles: Array<{
            x: number; y: number; vx: number; vy: number;
            size: number; opacity: number; hue: number;
        }> = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Initialize particles
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                hue: Math.random() > 0.5 ? 210 : 190,
            });
        }

        const drawGrid = () => {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.03)';
            ctx.lineWidth = 0.5;
            const gridSize = 60;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(3, 7, 18, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drawGrid();

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`;
                ctx.fill();

                // Connect nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - p.x;
                    const dy = particles[j].y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `hsla(210, 80%, 60%, ${0.08 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        // Initial clear
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full"
            style={{ zIndex: 0 }}
        />
    );
}

// ─── Hex Shield SVG Animation ───────────────────────────────────────────────
function AnimatedShield() {
    return (
        <div className="login-shield-container">
            <div className="login-shield-glow" />
            <div className="login-shield-ring login-shield-ring-1" />
            <div className="login-shield-ring login-shield-ring-2" />
            <div className="login-shield-ring login-shield-ring-3" />
            <div className="login-shield-icon">
                <Shield className="w-16 h-16 text-cyan-400" strokeWidth={1.5} />
            </div>
        </div>
    );
}

// ─── Scan Line Effect ───────────────────────────────────────────────────────
function ScanLine() {
    return <div className="login-scan-line" />;
}

// ─── Main Login Page ────────────────────────────────────────────────────────
export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [titleRevealed, setTitleRevealed] = useState(false);
    const [subtitleRevealed, setSubtitleRevealed] = useState(false);

    const { login, error, clearError } = useAuthStore();

    // Entrance animations
    useEffect(() => {
        const t1 = setTimeout(() => setTitleRevealed(true), 400);
        const t2 = setTimeout(() => setSubtitleRevealed(true), 900);
        const t3 = setTimeout(() => setShowForm(true), 1300);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;

        setIsSubmitting(true);
        clearError();

        await login(username.trim(), password);
        setIsSubmitting(false);
    }, [username, password, login, clearError]);

    return (
        <div className="login-page">
            <CyberBackground />
            <ScanLine />

            {/* Floating hex decorations */}
            <div className="login-hex-decor login-hex-decor-1" />
            <div className="login-hex-decor login-hex-decor-2" />
            <div className="login-hex-decor login-hex-decor-3" />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">

                {/* Shield Animation */}
                <AnimatedShield />

                {/* Title */}
                <div className={`login-title-block ${titleRevealed ? 'login-revealed' : ''}`}>
                    <h1 className="login-title">
                        <span className="login-title-aegis">AEGIS</span>
                        <span className="login-title-x">X</span>
                    </h1>
                    <div className="login-title-underline" />
                </div>

                {/* Subtitle */}
                <div className={`login-subtitle-block ${subtitleRevealed ? 'login-revealed' : ''}`}>
                    <p className="login-subtitle">
                        <Zap className="w-4 h-4 inline mr-1 text-cyan-400" />
                        AI-Powered Web Application Firewall
                    </p>
                    <p className="login-subtitle-small">Secure Operations Console</p>
                </div>

                {/* Login Card */}
                <div className={`login-card ${showForm ? 'login-card-visible' : ''}`}>
                    {/* Glowing border effect */}
                    <div className="login-card-glow" />

                    <div className="login-card-inner">
                        {/* Card Header */}
                        <div className="login-card-header">
                            <Lock className="w-5 h-5 text-cyan-400" />
                            <span>AUTHENTICATE</span>
                            <div className="login-card-header-line" />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="login-error">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="login-form">
                            {/* Username */}
                            <div className="login-field">
                                <label className="login-label">
                                    <span className="login-label-dot" />
                                    OPERATOR ID
                                </label>
                                <div className="login-input-wrapper">
                                    <input
                                        id="login-username"
                                        type="text"
                                        value={username}
                                        onChange={e => { setUsername(e.target.value); clearError(); }}
                                        placeholder="Enter username"
                                        autoComplete="username"
                                        autoFocus
                                        className="login-input"
                                        disabled={isSubmitting}
                                    />
                                    <div className="login-input-border" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="login-field">
                                <label className="login-label">
                                    <span className="login-label-dot" />
                                    ACCESS KEY
                                </label>
                                <div className="login-input-wrapper">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); clearError(); }}
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                        className="login-input login-input-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="login-eye-btn"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <div className="login-input-border" />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isSubmitting || !username.trim() || !password.trim()}
                                className="login-submit-btn"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="login-spinner" />
                                        <span>AUTHENTICATING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5" />
                                        <span>INITIALIZE SESSION</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="login-card-footer">
                            <div className="login-card-footer-dot" />
                            <span>ENCRYPTED CONNECTION • TLS 1.3</span>
                        </div>
                    </div>
                </div>

                {/* Version */}
                <div className={`login-version ${showForm ? 'login-revealed' : ''}`}>
                    AegisX WAF v1.0 • Security Operations Center
                </div>
            </div>
        </div>
    );
}
