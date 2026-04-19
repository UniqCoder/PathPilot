import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import PageMotionShell from "../components/PageMotionShell";
import PosthogProvider from "@/components/analytics/PosthogProvider";
import ToasterProvider from "@/components/ui/ToasterProvider";

export const metadata: Metadata = {
  title: "PathPilot — AI Career Survival Roadmap",
  description:
    "Hyper-personalized career roadmaps for Indian students navigating the AI disruption era.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@700,800&f[]=satoshi@300,400,500&display=swap"
        />
      </head>
      <body>
        <PosthogProvider>
          <div className="bg-noise" aria-hidden="true" />
          <SiteHeader />
          <PageMotionShell>{children}</PageMotionShell>
          <ToasterProvider />
        </PosthogProvider>
      </body>
    </html>
  );
}
