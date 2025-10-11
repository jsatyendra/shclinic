import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "./AuthProvider";
import DatabaseWrapper from "../components/DatabaseWrapper";

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
          {children}
          <DatabaseWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
