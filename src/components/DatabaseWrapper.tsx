"use client";

import dynamic from "next/dynamic";

// Import the database status component with no SSR to ensure it only runs on the client side
const DatabaseStatus = dynamic(() => import("./DatabaseStatus"), {
  ssr: false,
});

export default function DatabaseWrapper() {
  return <DatabaseStatus />;
}
