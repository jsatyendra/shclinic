import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "./AuthProvider";
import DatabaseWrapper from "../components/DatabaseWrapper";
import { ToastProvider } from "../components/Toast";
import ErrorBoundary from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "SH Clinic Management",
  description: "Homeopathic Clinic Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif] bg-[#f1f8e9]">
        <AuthProvider>
          <ErrorBoundary>
            <ToastProvider>
              {children}
              <DatabaseWrapper />
            </ToastProvider>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
