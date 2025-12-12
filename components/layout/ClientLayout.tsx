"use client";

import { useState } from "react";
import { ComposeForm } from "@/components/compose/ComposeForm";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [showCompose, setShowCompose] = useState(false);

  return (
    <>
      {children}
      
      {/* Compose Modal - renders on top of everything */}
      <ComposeForm
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
      />
    </>
  );
}

// Export a function to open compose from anywhere
export const openCompose = () => {
  window.dispatchEvent(new CustomEvent('openCompose'));
};