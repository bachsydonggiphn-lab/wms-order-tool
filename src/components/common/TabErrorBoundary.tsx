import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

interface TabErrorBoundaryProps {
  tabName: string;
  onResetTab?: () => void;
  onNavigateHome?: () => void;
  children: ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TabErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[TabErrorBoundary] Lỗi xảy ra tại tab "${this.props.tabName}":`, error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    try {
      sessionStorage.removeItem('wms_cache_orders_4');
      sessionStorage.removeItem('wms_cache_orders_5');
      sessionStorage.removeItem('wms_cache_orders_8');
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onResetTab) {
      this.props.onResetTab();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-6 p-6 sm:p-8 bg-white border border-rose-200 rounded-3xl shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Đã Cách Ly Sự Cố Thành Công</span>
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1">
            Tab "{this.props.tabName}" Đang Gặp Lỗi Cục Bộ
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto mb-5 leading-relaxed">
            Hệ thống phân tầng đã cô lập lỗi này hoàn toàn. Các tab còn lại vẫn đang hoạt động 100% bình thường mà không bị ảnh hưởng.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải Lại Riêng Tab Này</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                type="button"
                onClick={this.props.onNavigateHome}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay Về Vận Hành Đơn Hàng</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {this.state.showDetails ? 'Ẩn Chi Tiết Lỗi' : 'Xem Chi Tiết Lỗi (Debug)'}
            </button>
          </div>

          {this.state.showDetails && (
            <div className="text-left bg-slate-900 text-slate-200 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800 shadow-inner">
              <div className="text-rose-400 font-bold mb-1">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              <div className="text-slate-400 text-[11px] whitespace-pre-wrap">
                {this.state.error?.stack}
              </div>
              {this.state.errorInfo && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
