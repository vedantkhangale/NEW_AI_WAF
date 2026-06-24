/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'aegis-dark': {
                    900: '#0a0e1a',
                    800: '#121623',
                    700: '#1a1f2e',
                    600: '#242938',
                },
                'aegis-blue': {
                    500: '#3b82f6',
                    600: '#2563eb',
                },
                'aegis-orange': '#f97316',
                'aegis-red': '#ef4444',
                'aegis-green': '#10b981',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'arc-draw': 'arc-draw 2s ease-in-out infinite',
            },
            keyframes: {
                'arc-draw': {
                    '0%, 100%': { strokeDashoffset: '1000' },
                    '50%': { strokeDashoffset: '0' },
                },
            },
        },
    },
    plugins: [],
}
