"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { getActiveSidebarHref } from "@/shared/utils/sidebarRouteMatch";
import { APP_CONFIG } from "@/shared/constants/appConfig";
import NextRouteLogo from "./NextRouteLogo";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import CloudSyncStatus from "./CloudSyncStatus";
import { useTranslations } from "next-intl";
import {
  HIDDEN_SIDEBAR_ITEMS_SETTING_KEY,
  SIDEBAR_SETTINGS_UPDATED_EVENT,
  SIDEBAR_SECTION_ORDER_KEY,
  SIDEBAR_ITEM_ORDER_KEY,
  SIDEBAR_SECTIONS,
  getSectionItems,
  normalizeHiddenSidebarItems,
  applySectionOrder,
  applyItemOrder,
  type SidebarSectionId,
  type SidebarItemDefinition,
  type SidebarItemGroup,
  type SidebarItemOrder,
} from "@/shared/constants/sidebarVisibility";

const isE2EMode = process.env.NEXT_PUBLIC_NEXTROUTE_E2E_MODE === "1";
const DEFAULT_EXPANDED: SidebarSectionId = "omni-proxy";
const EXPANDED_SECTIONS_KEY = "sidebar-expanded-sections";
const PINNED_SECTIONS_KEY = "sidebar-pinned-sections";

type SidebarProps = {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMacElectron?: boolean;
};

type HoveredItem = { id: string; label: string; x: number; y: number } | null;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Sidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
  isMacElectron = false,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");
  const sidebarRef = useRef<HTMLElement>(null);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
  const [sidebarSectionOrder, setSidebarSectionOrder] = useState<SidebarSectionId[]>([]);
  const [sidebarItemOrder, setSidebarItemOrder] = useState<SidebarItemOrder>({});
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSectionId>>(
    new Set([DEFAULT_EXPANDED])
  );
  const [pinnedSections, setPinnedSections] = useState<Set<SidebarSectionId>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null);

  useEffect(() => {
    const storedExpanded = loadFromStorage<SidebarSectionId[]>(EXPANDED_SECTIONS_KEY, [
      DEFAULT_EXPANDED,
    ]);
    const pinnedRaw = (() => {
      try {
        return localStorage.getItem(PINNED_SECTIONS_KEY);
      } catch {
        return null;
      }
    })();
    const storedPinned: SidebarSectionId[] =
      pinnedRaw !== null
        ? (JSON.parse(pinnedRaw) as SidebarSectionId[])
        : (SIDEBAR_SECTIONS.filter((s) => s.defaultPinned).map((s) => s.id) as SidebarSectionId[]);

    const initialExpanded = new Set<SidebarSectionId>(
      storedExpanded.length > 0 ? storedExpanded : [DEFAULT_EXPANDED]
    );
    const initialPinned = new Set<SidebarSectionId>(storedPinned);
    for (const id of initialPinned) initialExpanded.add(id);

    setExpandedSections(initialExpanded);
    setPinnedSections(initialPinned);
  }, []);

  useEffect(() => {
    const applySettings = (data) => {
      setShowDebug(data?.debugMode === true);
      setHiddenSidebarItems(normalizeHiddenSidebarItems(data?.[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]));
      setCustomAppName(data?.instanceName || null);
      setCustomLogo(data?.customLogoBase64 || data?.customLogoUrl || null);
    };

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        applySettings(data);
        if (Array.isArray(data?.[SIDEBAR_SECTION_ORDER_KEY])) {
          setSidebarSectionOrder(data[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
        }
        if (data?.[SIDEBAR_ITEM_ORDER_KEY] && typeof data[SIDEBAR_ITEM_ORDER_KEY] === "object") {
          setSidebarItemOrder(data[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
        }
      })
      .catch(() => {});

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      if ("debugMode" in detail) setShowDebug(detail.debugMode === true);
      if (HIDDEN_SIDEBAR_ITEMS_SETTING_KEY in detail) {
        setHiddenSidebarItems(
          normalizeHiddenSidebarItems(detail[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY])
        );
      }
      if (SIDEBAR_SECTION_ORDER_KEY in detail && Array.isArray(detail[SIDEBAR_SECTION_ORDER_KEY])) {
        setSidebarSectionOrder(detail[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
      }
      if (
        SIDEBAR_ITEM_ORDER_KEY in detail &&
        detail[SIDEBAR_ITEM_ORDER_KEY] &&
        typeof detail[SIDEBAR_ITEM_ORDER_KEY] === "object"
      ) {
        setSidebarItemOrder(detail[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
      }
      if ("instanceName" in detail) setCustomAppName((detail.instanceName as string) || null);
      if ("customLogoBase64" in detail) {
        setCustomLogo((detail.customLogoBase64 as string) || null);
      } else if ("customLogoUrl" in detail) {
        setCustomLogo((detail.customLogoUrl as string) || null);
      }
    };

    window.addEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    return () =>
      window.removeEventListener(
        SIDEBAR_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated as EventListener
      );
  }, []);

  const getSidebarLabel = (key: string, fallback: string) =>
    typeof t.has === "function" && t.has(key) ? t(key) : fallback;

  const resolveItem = (item: SidebarItemDefinition, hidden: Set<string>) => {
    if (hidden.has(item.id)) return null;
    const subtitle = item.subtitleKey ? getSidebarLabel(item.subtitleKey, "") : undefined;
    return {
      ...item,
      label: getSidebarLabel(item.i18nKey, item.id),
      subtitle: subtitle || undefined,
    };
  };

  const hiddenSidebarSet = new Set(hiddenSidebarItems);

  const orderedSections = applySectionOrder(
    SIDEBAR_SECTIONS.filter((section) => section.visibility !== "debug" || showDebug),
    sidebarSectionOrder
  );

  const visibleSections = orderedSections
    .map((section) => {
      const orderedChildren = applyItemOrder(
        section.children,
        sidebarItemOrder[section.id as SidebarSectionId] ?? []
      );

      const children = orderedChildren
        .map((child) => {
          if ("type" in child && child.type === "group") {
            const items = child.items
              .map((item) => resolveItem(item, hiddenSidebarSet))
              .filter(Boolean) as (SidebarItemDefinition & { label: string })[];
            if (items.length === 0) return null;
            if (items.length === 1) return items[0];
            return {
              ...child,
              title: getSidebarLabel(child.titleKey, child.titleFallback),
              items,
            } as SidebarItemGroup & {
              title: string;
              items: (SidebarItemDefinition & { label: string })[];
            };
          }
          return resolveItem(child as SidebarItemDefinition, hiddenSidebarSet);
        })
        .filter(Boolean);

      return {
        ...section,
        title: getSidebarLabel(section.titleKey, section.titleFallback),
        children,
      };
    })
    .filter((section) => {
      const allItems = section.children.flatMap((child: any) =>
        child.type === "group" ? child.items : [child]
      );
      return allItems.length > 0;
    });

  const allVisibleItems = visibleSections.flatMap((section) =>
    section.children.flatMap((child: any) => (child.type === "group" ? child.items : [child]))
  );

  const activeHref = getActiveSidebarHref(pathname, allVisibleItems);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loginTime = localStorage.getItem("nextroute_login_time");
      if (!loginTime && pathname !== "/login" && !pathname.startsWith("/api/")) {
        window.location.href = "/login";
        return;
      }
    }

    if (collapsed) return;
    for (const section of visibleSections) {
      const sectionItems = section.children.flatMap((child: any) =>
        child.type === "group" ? child.items : [child]
      );
      if (sectionItems.some((item: any) => !item.external && item.href === activeHref)) {
        setExpandedSections((prev) => {
          if (prev.has(section.id as SidebarSectionId)) return prev;
          const next = new Set(prev);
          next.add(section.id as SidebarSectionId);
          saveToStorage(EXPANDED_SECTIONS_KEY, [...next]);
          return next;
        });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, collapsed]);

  const toggleSection = useCallback(
    (sectionId: SidebarSectionId) => {
      setExpandedSections((prev) => {
        const isOpen = prev.has(sectionId);
        let next: Set<SidebarSectionId>;
        if (isOpen) {
          next = new Set(prev);
          next.delete(sectionId);
        } else {
          next = new Set<SidebarSectionId>();
          for (const id of pinnedSections) next.add(id);
          next.add(sectionId);
        }
        saveToStorage(EXPANDED_SECTIONS_KEY, [...next]);
        return next;
      });
    },
    [pinnedSections]
  );

  const togglePin = useCallback((sectionId: SidebarSectionId) => {
    setPinnedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
        setExpandedSections((prevExp) => {
          if (prevExp.has(sectionId)) return prevExp;
          const nextExp = new Set(prevExp);
          nextExp.add(sectionId);
          saveToStorage(EXPANDED_SECTIONS_KEY, [...nextExp]);
          return nextExp;
        });
      }
      saveToStorage(PINNED_SECTIONS_KEY, [...next]);
      return next;
    });
  }, []);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch (e) {}
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch (e) {}
    setIsRestarting(false);
    setShowRestartModal(false);
    setIsDisconnected(true);
    setTimeout(() => globalThis.location.reload(), 3000);
  };

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, id: string, label: string) => {
      if (!collapsed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      setHoveredItem({
        id,
        label,
        x: (sidebarRect?.right ?? 64) + 8,
        y: rect.top + rect.height / 2,
      });
    },
    [collapsed]
  );

  const handleMouseLeave = useCallback(() => setHoveredItem(null), []);

  const renderNavLink = (item) => {
    const active = !item.external && activeHref === item.href;
    const className = cn(
      "flex items-center gap-2.5 rounded-xl transition-all duration-150 group relative",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
      active
        ? "bg-primary/10 text-primary"
        : "text-text-muted hover:bg-surface/60 hover:text-text-main"
    );
    const iconClassName = cn(
      "material-symbols-outlined text-[18px] shrink-0 transition-colors duration-150",
      active ? "text-primary" : "text-text-muted/70 group-hover:text-text-main"
    );
    const content = (
      <>
        {/* Active indicator pill */}
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
        )}
        <span className={iconClassName} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
          {item.icon}
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium leading-tight">{item.label}</span>
            {item.subtitle && (
              <span className="truncate text-[10px] text-text-muted/50 mt-0.5">{item.subtitle}</span>
            )}
          </div>
        )}
      </>
    );
    const sharedProps = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => handleMouseEnter(e, item.id, item.label),
      onMouseLeave: handleMouseLeave,
    };

    if (item.external) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className={className}
          {...sharedProps}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={className}
        {...sharedProps}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "flex h-full min-h-0 flex-col bg-sidebar transition-all duration-300 ease-in-out",
          "border-r border-border/40",
          collapsed ? "w-16" : "w-[228px]"
        )}
        style={{ paddingTop: isMacElectron ? "var(--desktop-safe-top)" : undefined }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-primary focus:text-white focus:rounded-md focus:m-2"
        >
          Skip to content
        </a>

        {/* ── Top bar: traffic lights + collapse toggle ── */}
        {(onToggleCollapse || !isMacElectron) && (
          <div
            className={cn(
              "flex items-center gap-1.5 shrink-0",
              isMacElectron ? "pt-3 pb-2" : "pt-4 pb-2",
              collapsed ? "px-3 justify-center" : "px-4"
            )}
            aria-hidden="true"
          >
            {!isMacElectron && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] opacity-70" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] opacity-70" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] opacity-70" />
              </>
            )}
            {!collapsed && <div className="flex-1" />}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={cn(
                  "rounded-lg p-1 text-text-muted/40 transition-all hover:bg-surface hover:text-text-muted",
                  collapsed && !isMacElectron && "mt-1",
                  isMacElectron && "ml-auto"
                )}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  {collapsed ? "chevron_right" : "chevron_left"}
                </span>
              </button>
            )}
          </div>
        )}

        {/* ── Brand / Logo ── */}
        <div className={cn("shrink-0 pb-3", collapsed ? "px-2" : "px-3")}>
          <Link
            href="/home"
            className={cn(
              "flex items-center rounded-xl transition-colors hover:bg-surface/50",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2 py-2"
            )}
          >
            <div className="flex items-center justify-center size-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-sm shadow-primary/25 shrink-0">
              {customLogo ? (
                <img
                  src={customLogo}
                  alt={customAppName || APP_CONFIG.name}
                  className="size-4 object-contain"
                />
              ) : (
                <NextRouteLogo size={16} className="text-white" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold tracking-tight text-text-main truncate leading-tight">
                  {customAppName || APP_CONFIG.name}
                </span>
                <span className="text-[10px] text-text-muted/50 leading-tight">
                  v{APP_CONFIG.version}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* ── Nav divider ── */}
        <div className="mx-3 h-px bg-border/40 mb-2 shrink-0" />

        {/* ── Navigation ── */}
        <nav
          aria-label="Main navigation"
          className={cn(
            "min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar",
            collapsed ? "px-2 space-y-1" : "px-2 space-y-0.5"
          )}
        >
          {visibleSections.map((section, idx) => {
            const sectionId = section.id as SidebarSectionId;
            const isExpanded = expandedSections.has(sectionId);
            const isPinned = pinnedSections.has(sectionId);
            const isFirst = idx === 0;
            const sectionItems = section.children.flatMap((child: any) =>
              child.type === "group" ? child.items : [child]
            );

            // Collapsed mode: flat icons with dividers
            if (collapsed) {
              return (
                <div key={section.id}>
                  {!isFirst && (
                    <div className="h-px bg-border/30 my-1.5 mx-1" />
                  )}
                  <div className="space-y-0.5">{sectionItems.map(renderNavLink)}</div>
                </div>
              );
            }

            // Section without title (e.g. Home)
            if (section.showTitle === false) {
              return (
                <div key={section.id} className={cn("space-y-0.5", !isFirst && "mt-1")}>
                  {sectionItems.map(renderNavLink)}
                </div>
              );
            }

            // Collapsible section
            return (
              <div key={section.id} className={isFirst ? "space-y-0.5" : "mt-3"}>
                {/* Section header */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface/40 transition-colors cursor-pointer group/header mb-0.5"
                  onClick={() => toggleSection(sectionId)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <span className="flex-1 text-[10px] font-semibold text-text-muted/50 uppercase tracking-widest group-hover/header:text-text-muted/80 transition-colors">
                    {section.title}
                  </span>

                  {/* Pin */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(sectionId);
                    }}
                    title={isPinned ? "Unpin section" : "Pin section open"}
                    className={cn(
                      "p-0.5 rounded transition-all shrink-0",
                      isPinned
                        ? "text-primary opacity-100"
                        : "text-text-muted/30 opacity-0 group-hover/header:opacity-100 hover:text-text-muted/60"
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "10px",
                        ...(isPinned ? { fontVariationSettings: "'FILL' 1" } : {}),
                      }}
                    >
                      push_pin
                    </span>
                  </button>

                  {/* Chevron */}
                  <span
                    className={cn(
                      "material-symbols-outlined text-[13px] text-text-muted/30 transition-transform duration-200 group-hover/header:text-text-muted/60 shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  >
                    expand_more
                  </span>
                </div>

                {isExpanded && (
                  <div className="space-y-0.5">
                    {section.children.map((child: any) => {
                      if (child.type === "group") {
                        if (child.items.length === 0) return null;
                        return (
                          <div key={child.id} className="mt-2">
                            <div className="flex items-center gap-2 px-2 py-0.5 mb-0.5">
                              <div className="h-px flex-1 bg-border/30" />
                              <span className="text-[9px] font-semibold text-text-muted/35 uppercase tracking-widest">
                                {child.title}
                              </span>
                              <div className="h-px flex-1 bg-border/30" />
                            </div>
                            {child.items.map(renderNavLink)}
                          </div>
                        );
                      }
                      return renderNavLink(child);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {!isE2EMode && <CloudSyncStatus collapsed={collapsed} />}

        {/* ── Bottom actions ── */}
        <div
          className={cn(
            "shrink-0 border-t border-border/40 p-2",
            collapsed ? "flex flex-col gap-1" : "flex gap-1.5"
          )}
          style={{
            paddingBottom: isMacElectron ? "calc(0.5rem + var(--desktop-safe-bottom))" : undefined,
          }}
        >
          <button
            onClick={() => setShowRestartModal(true)}
            title={t("restart")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-150",
              "text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/8",
              collapsed ? "p-2.5" : "flex-1 min-w-0 px-2 py-2 text-xs"
            )}
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            {!collapsed && <span className="truncate">{t("restart")}</span>}
          </button>
          <button
            onClick={() => setShowShutdownModal(true)}
            title={t("shutdown")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-150",
              "text-red-500/70 hover:text-red-500 hover:bg-red-500/8",
              collapsed ? "p-2.5" : "flex-1 min-w-0 px-2 py-2 text-xs"
            )}
          >
            <span className="material-symbols-outlined text-[15px]">power_settings_new</span>
            {!collapsed && <span className="truncate">{t("shutdown")}</span>}
          </button>
        </div>
      </aside>

      {/* Tooltip for collapsed mode */}
      {collapsed && hoveredItem && (
        <div
          className="fixed z-[200] pointer-events-none flex items-center"
          style={{ left: hoveredItem.x, top: hoveredItem.y, transform: "translateY(-50%)" }}
        >
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-r-[6px] border-t-transparent border-b-transparent border-r-sidebar" />
          <div className="px-2.5 py-1.5 bg-sidebar text-text-main text-xs font-medium rounded-lg shadow-lg border border-border/60 whitespace-nowrap">
            {hoveredItem.label}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
        onConfirm={handleShutdown}
        title={t("shutdown")}
        message={t("shutdownConfirm")}
        confirmText={t("shutdown")}
        cancelText={tc("cancel")}
        variant="danger"
        loading={isShuttingDown}
      />

      <ConfirmModal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        onConfirm={handleRestart}
        title={t("restart")}
        message={t("restartConfirm")}
        confirmText={t("restart")}
        cancelText={tc("cancel")}
        variant="warning"
        loading={isRestarting}
      />

      {isDisconnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-8">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-red-500/15 text-red-400 mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px]">power_off</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Server Disconnected</h2>
            <p className="text-text-muted text-sm mb-6">
              The proxy server has been stopped or is restarting.
            </p>
            <Button variant="secondary" onClick={() => globalThis.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
