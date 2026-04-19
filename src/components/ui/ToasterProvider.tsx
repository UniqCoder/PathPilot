"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#10141f",
          color: "#f3f4f7",
        },
      }}
    />
  );
}
