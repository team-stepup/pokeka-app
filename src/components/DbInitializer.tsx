"use client";

import { useEffect } from "react";
import { seedInitialData } from "@/lib/hooks";

export default function DbInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedInitialData();
  }, []);
  return <>{children}</>;
}
