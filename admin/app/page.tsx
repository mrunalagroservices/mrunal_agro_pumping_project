"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { httpClient } from "@/lib/api";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(httpClient.getToken() ? "/overview" : "/login");
  }, [router]);
  return null;
}
