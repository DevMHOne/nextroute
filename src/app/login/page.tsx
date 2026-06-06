"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Button, Input } from "@/shared/components";
import NextRouteLogo from "@/shared/components/NextRouteLogo";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [setupComplete, setSetupComplete] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [nodeVersion, setNodeVersion] = useState(null);
  const [nodeCompatible, setNodeCompatible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/settings/require-login`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.nodeVersion) setNodeVersion(data.nodeVersion);
          if (data.nodeCompatible === false) setNodeCompatible(false);
          if (data.requireLogin === false) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
          setHasPassword(!!data.hasPassword);
          setSetupComplete(!!data.setupComplete);
        } else {
          setHasPassword(true);
          setSetupComplete(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setHasPassword(true);
        setSetupComplete(true);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem("nextroute_login_time", String(Date.now()));
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        if (data.needsSetup) {
          router.push("/dashboard/onboarding");
          return;
        }
        setError(data.error || t("invalidPassword"));
      }
    } catch (err) {
      setError(t("errorOccurredRetry"));
    } finally {
      setLoading(false);
    }
  };

  const nodeWarningBanner =
    !nodeCompatible && nodeVersion ? (
      <div className="w-full max-w-lg mx-auto mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="bg-red-950/60 border border-red-500/30 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-red-400 text-[20px]">error</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-300 mb-1">{t("nodeIncompatibleTitle")}</h3>
              <p className="text-xs text-red-200/70 leading-relaxed mb-3">
                {t("nodeIncompatibleDesc", { version: nodeVersion })}
              </p>
              <div className="bg-black/40 rounded-lg px-3 py-2 font-mono text-xs border border-red-500/20">
                <code className="text-amber-300">nvm install 22 && nvm use 22</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  /* ── Loading skeleton ── */
  if (hasPassword === null || setupComplete === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6">
        {nodeWarningBanner}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-text-muted">{t("loading")}</span>
        </div>
      </div>
    );
  }

  /* ── Onboarding needed ── */
  if (!hasPassword && !setupComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6">
        {nodeWarningBanner}
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/25">
                <NextRouteLogo size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-text-main tracking-tight">NextRoute</span>
            </div>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-primary text-[32px]">rocket_launch</span>
            </div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">{t("welcome")}</h1>
            <p className="text-text-muted mt-2 text-sm">{t("configureInstance")}</p>
          </div>
          <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-7 shadow-elevated">
            <p className="text-text-muted text-sm leading-relaxed mb-5 text-center">
              {t("runOnboardingWizard")}
            </p>
            <Button
              variant="primary"
              className="w-full h-11 text-sm font-medium"
              onClick={() => router.push("/dashboard/onboarding")}
            >
              {t("startOnboarding")}
            </Button>
          </div>
          <p className="text-center text-xs text-text-muted/50 mt-6">
            NextRoute — {t("unifiedProxy")}
          </p>
        </div>
      </div>
    );
  }

  /* ── No password set ── */
  if (!hasPassword && setupComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6">
        {nodeWarningBanner}
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/25">
                <NextRouteLogo size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-text-main tracking-tight">NextRoute</span>
            </div>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/15 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-amber-500 text-[32px]">shield_person</span>
            </div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">{t("secureYourInstance")}</h1>
            <p className="text-text-muted mt-2 text-sm">{t("passwordNotEnabled")}</p>
          </div>
          <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-7 shadow-elevated">
            <p className="text-text-muted text-sm leading-relaxed mb-5 text-center">
              {t("setPasswordDescription")}
            </p>
            <Button
              variant="primary"
              className="w-full h-11 text-sm font-medium"
              onClick={() => router.push("/dashboard/onboarding")}
            >
              {t("configurePassword")}
            </Button>
          </div>
          <p className="text-center text-xs text-text-muted/50 mt-6">
            NextRoute — {t("unifiedAiApiProxy")}
          </p>
        </div>
      </div>
    );
  }

  /* ── Main Login ── */
  return (
    <div className="min-h-screen flex flex-col bg-bg overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-primary/6 blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-accent/5 blur-[90px]" />
      </div>

      {nodeWarningBanner && (
        <div className="relative z-10 flex justify-center pt-6 px-6">{nodeWarningBanner}</div>
      )}

      <div className="relative flex-1 flex">
        {/* ── Left: Form panel ── */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div
            className={`w-full max-w-sm transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-primary/20">
                <NextRouteLogo size={22} className="text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-text-main tracking-tight">NextRoute</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-medium text-success/80 tracking-wide uppercase">Active</span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-text-main tracking-tight leading-tight">
                {t("signIn")}
              </h1>
              <p className="text-text-muted mt-1.5 text-sm">{t("enterPassword")}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {t("password")}
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-11 bg-surface/60 backdrop-blur-sm"
                />
                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 pt-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {error}
                  </p>
                )}
                <p className="text-[11px] text-text-muted/50 pt-0.5">{t("defaultPasswordHint")}</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20"
                loading={loading}
              >
                {t("continue")}
              </Button>
            </form>

            {/* Footer links */}
            <div className="mt-6 pt-5 border-t border-border/60 flex items-center justify-between">
              <a
                href="/forgot-password"
                className="text-xs text-text-muted hover:text-primary transition-colors"
              >
                {t("forgotPassword")}
              </a>
              <span className="text-[10px] text-text-muted/40">v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Feature showcase (lg+) ── */}
        <div className="hidden lg:flex lg:w-[52%] relative items-center justify-center p-16">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Glass card */}
          <div
            className={`relative w-full max-w-md transition-all duration-700 delay-150 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <div className="bg-surface/40 backdrop-blur-xl border border-border/60 rounded-3xl p-8 shadow-elevated ring-1 ring-white/5">
              {/* Header */}
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/15 rounded-full px-3 py-1 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">
                    AI Gateway
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-main leading-snug mb-2">
                  {t("unifiedAiApiProxy")}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">{t("unifiedAiApiProxyDesc")}</p>
              </div>

              {/* Feature list */}
              <div className="space-y-3">
                {[
                  {
                    icon: "swap_horiz",
                    title: t("featureMultiProviderTitle"),
                    desc: t("featureMultiProviderDesc"),
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    icon: "speed",
                    title: t("featureLoadBalancingTitle"),
                    desc: t("featureLoadBalancingDesc"),
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    icon: "analytics",
                    title: t("featureUsageTrackingTitle"),
                    desc: t("featureUsageTrackingDesc"),
                    color: "text-violet-400",
                    bg: "bg-violet-500/10",
                  },
                ].map((item) => (
                  <div
                    key={item.icon}
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-bg/40 border border-border/50 hover:border-border transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className={`material-symbols-outlined ${item.color} text-[18px]`}>
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-main">{item.title}</h3>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats bar */}
              <div className="mt-6 pt-5 border-t border-border/50 grid grid-cols-3 gap-4">
                {[
                  { label: "Providers", value: "50+" },
                  { label: "Uptime", value: "99.9%" },
                  { label: "Latency", value: "<10ms" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-base font-bold text-text-main">{s.value}</div>
                    <div className="text-[10px] text-text-muted/60 mt-0.5 uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
