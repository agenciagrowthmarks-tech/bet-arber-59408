import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center">
        <p className="text-sm text-muted-foreground">
          © 2025 PegAI Odds – Desenvolvido com tecnologia Paulo Victor.
        </p>
      </footer>
    </div>
  );
}
