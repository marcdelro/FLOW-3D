import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "lg";
};

export function Modal({ open, onClose, title, children, size = "lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative w-full ${maxW} max-h-[88vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f1117] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}
