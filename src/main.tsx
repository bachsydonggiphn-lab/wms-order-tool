import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-white">Đã xảy ra lỗi hiển thị</h1>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'Có lỗi xảy ra khi nạp dữ liệu. Vui lòng bấm Tải lại trang.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition cursor-pointer"
              >
                Tải lại trang
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition cursor-pointer"
              >
                Xóa cache & Tải lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
