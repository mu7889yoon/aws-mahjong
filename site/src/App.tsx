import { useEffect, useMemo, useRef } from "react";
import AppLayout, { type AppLayoutProps } from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup, { type BreadcrumbGroupProps } from "@cloudscape-design/components/breadcrumb-group";
import SideNavigation, { type SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import TopNavigation, { type TopNavigationProps } from "@cloudscape-design/components/top-navigation";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  DownloadsPage,
  GeneralRulePage,
  HomePage,
  QuickStartPage,
  RulesPage,
  TilesPage,
  VersionOverviewPage,
  YakuPage,
} from "./pages/ContentPages";
import { SearchPage } from "./features/search/SearchPage";
import { versions } from "./content/versions";
import { rentalFormUrl } from "./content/site";
import { siteUrl } from "./app/paths";

const basePath = import.meta.env.BASE_URL;
const routerBasename = basePath === "/" ? "/" : basePath.replace(/\/$/, "");

function routePathFromHref(href: string): string {
  const target = new URL(href, window.location.origin);
  const base = routerBasename === "/" ? "" : routerBasename;
  const pathname = target.pathname.startsWith(base) ? target.pathname.slice(base.length) : target.pathname;
  return `${pathname || "/"}${target.search}${target.hash}`;
}

function useBreadcrumbItems(pathname: string): BreadcrumbGroupProps.Item[] {
  return useMemo(() => {
    const normalized = pathname.replace(/\/+$/, "") || "/";
    const items: BreadcrumbGroupProps.Item[] = [{ text: "ホーム", href: siteUrl("/") }];

    const globalPages: Record<string, string> = {
      "/quick-start": "Quick Start",
      "/rule": "全体ルール",
      "/download": "ダウンロード",
    };
    const globalTitle = globalPages[normalized];
    if (globalTitle) {
      items.push({ text: globalTitle, href: siteUrl(normalized) });
      return items;
    }

    const activeVersion = versions.find(
      (version) => normalized === `/${version.id}` || normalized.startsWith(`/${version.id}/`),
    );
    if (!activeVersion) {
      if (normalized !== "/") items.push({ text: "ページが見つかりません", href: siteUrl(normalized) });
      return items;
    }

    const versionRoot = `/${activeVersion.id}/`;
    items.push({ text: activeVersion.title || activeVersion.id, href: siteUrl(versionRoot) });
    const section = normalized.slice(versionRoot.length - 1).split("/")[1];
    const sectionTitles: Record<string, string> = {
      rule: "ルール",
      tile: "牌一覧",
      yaku: "役一覧",
      search: "役検索",
    };
    if (section && sectionTitles[section]) items.push({ text: sectionTitles[section], href: siteUrl(normalized) });
    return items;
  }, [pathname]);
}

function navigationItems(): SideNavigationProps.Item[] {
  const versionItems: SideNavigationProps.Item[] = versions.map((version) => ({
    type: "section",
    text: version.title || version.id,
    items: [
      { type: "link", text: "バージョン概要", href: siteUrl(`/${version.id}/`) },
      { type: "link", text: "ルール", href: siteUrl(`/${version.id}/rule/`) },
      { type: "link", text: "牌一覧", href: siteUrl(`/${version.id}/tile/`) },
      { type: "link", text: "役一覧", href: siteUrl(`/${version.id}/yaku/`) },
      { type: "link", text: "役検索", href: siteUrl(`/${version.id}/search/`) },
    ],
  }));

  return [
    { type: "link", text: "ホーム", href: siteUrl("/") },
    { type: "link", text: "Quick Start", href: siteUrl("/quick-start/") },
    { type: "link", text: "全体ルール", href: siteUrl("/rule/") },
    { type: "link", text: "ダウンロード", href: siteUrl("/download/") },
    ...versionItems,
    { type: "link", text: "貸出はこちら", href: rentalFormUrl, external: true },
  ];
}

function PageRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="quick-start/" element={<QuickStartPage />} />
      <Route path="rule/" element={<GeneralRulePage />} />
      <Route path="download/" element={<DownloadsPage />} />
      {versions.flatMap((version) => [
        <Route key={`${version.id}-overview`} path={`${version.id}/`} element={<VersionOverviewPage key={version.id} version={version} />} />,
        <Route key={`${version.id}-rules`} path={`${version.id}/rule/`} element={<RulesPage key={version.id} version={version} />} />,
        <Route key={`${version.id}-tiles`} path={`${version.id}/tile/`} element={<TilesPage key={version.id} version={version} />} />,
        <Route key={`${version.id}-yaku`} path={`${version.id}/yaku/`} element={<YakuPage key={version.id} version={version} />} />,
        <Route key={`${version.id}-search`} path={`${version.id}/search/`} element={<SearchPage key={version.id} version={version} />} />,
      ])}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <h1>ページが見つかりません</h1>
      <p>URLを確認するか、ホームからページを選んでください。</p>
      <a href={siteUrl("/")}>ホームへ戻る</a>
    </section>
  );
}

function pageTitleForPath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return "AWS麻雀";

  const globalPages: Record<string, string> = {
    "/quick-start": "Quick Start",
    "/rule": "全体ルール",
    "/download": "ダウンロード",
  };
  if (globalPages[normalized]) return `${globalPages[normalized]} | AWS麻雀`;

  const activeVersion = versions.find(
    (version) => normalized === `/${version.id}` || normalized.startsWith(`/${version.id}/`),
  );
  if (!activeVersion) return "ページが見つかりません | AWS麻雀";

  const section = normalized.slice(`/${activeVersion.id}`.length).split("/").filter(Boolean)[0];
  const sectionTitles: Record<string, string> = {
    rule: "ルール",
    tile: "牌一覧",
    yaku: "役一覧",
    search: "役検索",
  };
  if (!section) return `${activeVersion.title || activeVersion.id} | AWS麻雀`;
  const pageTitle = (section && sectionTitles[section]) || activeVersion.title || activeVersion.id;
  return `${pageTitle} | ${activeVersion.title || activeVersion.id} | AWS麻雀`;
}

function SiteFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const appLayout = useRef<AppLayoutProps.Ref>(null);
  const breadcrumbs = useBreadcrumbItems(location.pathname);
  const activeVersion = versions.find(
    (version) => location.pathname === `/${version.id}` || location.pathname.startsWith(`/${version.id}/`),
  );
  const followHref = (href: string) => navigate(routePathFromHref(href));
  const activeSection = activeVersion
    ? location.pathname.slice(`/${activeVersion.id}`.length).split("/").filter(Boolean)[0]
    : undefined;
  const sectionPath = activeSection && ["rule", "tile", "yaku", "search"].includes(activeSection)
    ? `/${activeVersion?.id}/${activeSection}/`
    : activeVersion
      ? `/${activeVersion.id}/`
      : undefined;

  useEffect(() => {
    appLayout.current?.closeNavigationIfNecessary();
    document.title = pageTitleForPath(location.pathname);
    window.scrollTo(0, 0);
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById("site-main-content")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [location.pathname]);

  const utilities: TopNavigationProps.Utility[] = [
    {
      type: "button",
      text: "Quick Start",
      href: siteUrl("/quick-start/"),
      onFollow: (event) => {
        event.preventDefault();
        if (event.detail.href) followHref(event.detail.href);
      },
    },
    {
      type: "menu-dropdown",
      text: activeVersion?.id ?? "バージョン",
      title: "バージョンを選択",
      items: versions.map((version) => ({
        id: version.id,
        text: version.title || version.id,
        href: siteUrl(`/${version.id}/`),
      })),
      onItemFollow: (event) => {
        event.preventDefault();
        const version = versions.find((candidate) => candidate.id === event.detail.id);
        if (version) navigate(sectionPath ? sectionPath.replace(`/${activeVersion?.id}/`, `/${version.id}/`) : `/${version.id}/`);
      },
    },
  ];

  return (
    <>
      <TopNavigation
        id="site-top-navigation"
        identity={{
          href: siteUrl("/"),
          title: "AWS麻雀",
          onFollow: (event) => {
            event.preventDefault();
            navigate("/");
          },
        }}
        utilities={utilities}
      />
      <AppLayout
        ref={appLayout}
        ariaLabels={{
          navigation: "メインナビゲーション",
          navigationToggle: "メインナビゲーションを開く",
          navigationClose: "メインナビゲーションを閉じる",
        }}
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            ariaLabel="パンくずリスト"
            onFollow={(event) => {
              event.preventDefault();
              followHref(event.detail.href);
            }}
          />
        }
        content={<div id="site-main-content" className="site-main" tabIndex={-1}><PageRoutes /></div>}
        contentType="default"
        headerSelector="#site-top-navigation"
        navigation={
          <SideNavigation
            header={{ text: "AWS麻雀", href: siteUrl("/") }}
            items={navigationItems()}
            activeHref={siteUrl(location.pathname)}
            onFollow={(event) => {
              appLayout.current?.closeNavigationIfNecessary();
              if (new URL(event.detail.href, window.location.origin).origin !== window.location.origin) return;
              event.preventDefault();
              followHref(event.detail.href);
            }}
          />
        }
        toolsHide
      />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <SiteFrame />
    </BrowserRouter>
  );
}
