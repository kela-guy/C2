import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

/*
 * Sonner Toaster styled against the new substrate / state token
 * system. Toasts portal to <body> outside the Substrate tree, so
 * they pick their surface explicitly: --surface-3 lines up with
 * the in-app NotificationToast wells and reads as "alert chrome
 * sitting above the page substrate" without competing with
 * popovers (which sit at substrate 5).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      expand
      visibleToasts={4}
      style={{ zIndex: 60 }}
      toastOptions={{
        style: {
          background: 'var(--surface-3)',
          color: 'var(--slate-12)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-5)',
          borderRadius: '8px',
          direction: 'rtl',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
