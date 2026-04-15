'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantBranding {
  id: string;
  name: string;
  display_name: string | null;
  slug: string;
  tagline: string | null;
  welcome_message: string | null;
  organization_type: string | null;

  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  login_background_url: string | null;
  login_layout: string | null;

  features: Record<string, boolean>;

  signup_mode: string;
  privacy_policy_url: string | null;
  terms_url: string | null;
  show_powered_by: boolean;
  support_email: string | null;
}

interface TenantContextValue {
  tenant: TenantBranding | null;
  isLoading: boolean;
  isTenantContext: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  isTenantContext: false,
});

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTenant() {
  return useContext(TenantContext);
}

/**
 * Check if a specific feature is enabled for the current tenant.
 * Returns true if:
 * - Not in tenant context (main platform — all features available)
 * - In tenant context and the feature is explicitly enabled
 */
export function useTenantFeature(feature: string): boolean {
  const { tenant, isTenantContext } = useTenant();
  if (!isTenantContext) return true; // Main platform — all features
  if (!tenant) return true; // Still loading — default to enabled
  return tenant.features[feature] !== false; // Default to enabled unless explicitly disabled
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTenant() {
      try {
        const res = await fetch('/api/tenant');
        if (!res.ok) {
          // No tenant context — main platform
          setTenant(null);
          return;
        }
        const data = await res.json();
        if (!cancelled && data.tenant) {
          setTenant(data.tenant);
          injectTenantCSSVariables(data.tenant);
          updateBrowserMeta(data.tenant);
        }
      } catch {
        // Silently fail — main platform mode
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTenant();
    return () => { cancelled = true; };
  }, []);

  const isTenantContext = !!tenant;

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isTenantContext }}>
      {children}
    </TenantContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// CSS Variable Injection
// ---------------------------------------------------------------------------

function injectTenantCSSVariables(tenant: TenantBranding) {
  const root = document.documentElement;

  if (tenant.primary_color && tenant.primary_color !== '#007CF8') {
    root.style.setProperty('--primary', tenant.primary_color);
    root.style.setProperty('--primary-hover', darkenColor(tenant.primary_color, 15));
    root.style.setProperty('--primary-light', lightenColor(tenant.primary_color, 90));
    root.style.setProperty('--border-focus', tenant.primary_color);
  }

  if (tenant.secondary_color && tenant.secondary_color !== '#1F2937') {
    root.style.setProperty('--text-primary', tenant.secondary_color);
    root.style.setProperty('--foreground', tenant.secondary_color);
  }

  if (tenant.accent_color && tenant.accent_color !== '#10B981') {
    root.style.setProperty('--success', tenant.accent_color);
  }
}

function updateBrowserMeta(tenant: TenantBranding) {
  // Update page title
  const displayName = tenant.display_name || tenant.name;
  if (displayName) {
    document.title = displayName;
  }

  // Update favicon
  if (tenant.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = tenant.favicon_url;
  }
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function darkenColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
}

function lightenColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, Math.max(10, hsl.s - 30), Math.min(100, amount));
}
