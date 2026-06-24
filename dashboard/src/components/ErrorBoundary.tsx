import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h2 className="text-xl font-bold text-red-400 mb-2">⚠️ Component Error</h2>
                    <p className="text-gray-300 text-sm">{this.state.error?.message || 'Unknown error'}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white text-sm"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
