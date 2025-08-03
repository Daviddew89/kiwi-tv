import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

interface Toast {
  id: number;
  title: string;
  description?: string;
  duration?: number;
}

type ToastOptions = Omit<Toast, 'id'>;

let toasts: Toast[] = [];
let listeners: React.Dispatch<React.SetStateAction<Toast[]>>[] = [];

const toast = (options: ToastOptions) => {
  const newToast = { id: Date.now(), ...options };
  toasts = [...toasts, newToast];
  listeners.forEach(listener => listener(toasts));
};

const dismissToast = (id: number) => {
  toasts = toasts.filter(t => t.id !== id);
  listeners.forEach(listener => listener(toasts));
};

const ToastComponent: React.FC<Toast & { onDismiss: (id: number) => void }> = ({ id, title, description, duration = 5000, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div className="max-w-sm w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden m-2 animate-slide-in-up">
      <div className="p-4">
        <div className="flex items-start">
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-white">{title}</p>
            {description && <p className="mt-1 text-sm text-gray-300">{description}</p>}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className="bg-slate-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Toaster: React.FC = () => {
  const [localToasts, setLocalToasts] = useState(toasts);

  useEffect(() => {
    listeners.push(setLocalToasts);
    return () => {
      listeners = listeners.filter(listener => listener !== setLocalToasts);
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-4 space-y-2">
      {localToasts.map(t => (
        <ToastComponent key={t.id} {...t} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

if (typeof window !== 'undefined' && document.body) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
      const root = createRoot(toastContainer);
      root.render(<Toaster />);
    }
}

export const useToast = () => {
  return { toast };
};
