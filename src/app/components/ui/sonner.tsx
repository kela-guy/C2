import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";
import { useDirection } from "@/lib/direction";

const Toaster = ({ ...props }: ToasterProps) => {
  // Follow the app's live direction so sonner lays each toast out on
  // its logical axis: title on inline-start, action button on inline-
  // end. Previously the wrapper hardcoded `direction: 'rtl'` in the
  // toast style which forced every toast RTL — in LTR that put the
  // action button on the left and the label on the right (backwards).
  // sonner's own `dir` prop is the supported RTL mechanism and it
  // handles both orderings without any per-toast styling.
  const { direction } = useDirection();
  return (
    <Sonner
      theme="dark"
      dir={direction}
      className="toaster group"
      position="top-center"
      expand
      visibleToasts={4}
      style={{ zIndex: 60 }}
      toastOptions={{
        style: {
          background: 'var(--surface-3)',
          border: 'none',
          boxShadow: '0 0 0 1px var(--state-hover-overlay), var(--shadow-5)',
          borderRadius: '2px',
        },
        actionButtonStyle: {
          borderRadius: '2px',
        },
        cancelButtonStyle: {
          borderRadius: '2px',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
