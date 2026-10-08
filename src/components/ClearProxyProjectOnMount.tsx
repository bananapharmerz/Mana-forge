"use client";

import { useEffect } from "react";
import { useProxyProject } from "./ProxyProjectProvider";

export default function ClearProxyProjectOnMount() {
  const { clear } = useProxyProject();
  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
