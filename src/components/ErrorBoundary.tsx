import React from 'react';
import { MASTER_ADMIN_EMAIL } from '../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'حدث خطأ غير متوقع في التطبيق.';
    let isPerm = false;

    try {
      const parsed = JSON.parse(message) as {
        error?: string;
        operationType?: string;
      };
      if (parsed && typeof parsed.error === 'string') {
        if (
          parsed.error.toLowerCase().includes('insufficient permissions') ||
          parsed.error.toLowerCase().includes('permission-denied')
        ) {
          isPerm = true;
          message = `رفضت قاعدة البيانات هذه العملية لأن جميع صلاحيات النشر والتعديل والإدارة محصورة حصرياً بحساب المسؤول الوحيد (${MASTER_ADMIN_EMAIL}).`;
        } else {
          message = parsed.error;
        }
      }
    } catch {
      // Plain error message
    }

    return {
      hasError: true,
      errorMessage: message,
      isPermissionError: isPerm,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#0B0F14] text-slate-100 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-[#121820] p-6 text-center space-y-4">
            <h1 className="text-lg font-bold text-slate-50">
              {this.state.isPermissionError
                ? 'صلاحية مقصورة على المسؤول العام'
                : 'حدث تنبيه تقني عابر'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
