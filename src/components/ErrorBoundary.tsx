import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0C0A08] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#141210] border border-[#2A211A] p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-[#F97316]/20 border border-[#F97316]/40 text-[#F97316] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-[#F5F0EA] mb-2">Ops! Ocorreu um contratempo</h3>
            <p className="text-xs text-[#A8A29A] mb-6 leading-relaxed">
              Ocorreu um erro temporário na renderização. Clique no botão abaixo para restaurar a visualização.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full btn-sushi-primary text-white py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Tela</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
