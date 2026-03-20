import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

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
          background: '#1c1c20',
          border: 'none',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 8px 30px rgba(0,0,0,0.5)',
          borderRadius: '8px',
          direction: 'rtl',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
