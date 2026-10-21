import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  PanelLeft,
  LayoutGrid,
  FileText,
  CheckSquare,
  Boxes,
  Sun,
  Moon,
  HardDrive,
  Database,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ServiceCatalog } from './components/ServiceCatalog';
import { GcsBucketRequestForm } from './components/GcsBucketRequestForm';
import { EmptyStatePage } from './components/EmptyStatePage';
import { RESOURCE_KIND_REGISTRY } from './lib/kindRegistry';
import { getRuntimeConfig } from './lib/config';

type ActiveRoute =
  | 'catalog'
  | 'request-gcs-bucket'
  | 'my-requests'
  | 'approvals'
  | 'resources';

function parseHashRoute(hash: string): ActiveRoute {
  const clean = (hash || '').replace(/^#\/?/, '').toLowerCase();
  if (clean.startsWith('request/gcs_bucket') || clean.startsWith('provision/gcs_bucket')) {
    return 'request-gcs-bucket';
  }
  if (clean.startsWith('requests') || clean.startsWith('my-requests')) {
    return 'my-requests';
  }
  if (clean.startsWith('approvals')) {
    return 'approvals';
  }
  if (clean.startsWith('resources')) {
    return 'resources';
  }
  return 'catalog';
}

export function App() {
  const [route, setRoute] = useState<ActiveRoute>(() =>
    typeof window !== 'undefined' ? parseHashRoute(window.location.hash) : 'catalog'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  const navigate = (nextRoute: ActiveRoute) => {
    setRoute(nextRoute);
    if (typeof window !== 'undefined') {
      const hashMap: Record<ActiveRoute, string> = {
        catalog: '#/catalog',
        'request-gcs-bucket': '#/request/gcs_bucket',
        'my-requests': '#/my-requests',
        approvals: '#/approvals',
        resources: '#/resources',
      };
      window.location.hash = hashMap[nextRoute];
    }
  };

  const navItems: Array<{
    id: ActiveRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    matchRoutes: ActiveRoute[];
  }> = [
    {
      id: 'catalog',
      label: 'Catalog',
      icon: LayoutGrid,
      matchRoutes: ['catalog', 'request-gcs-bucket'],
    },
    {
      id: 'my-requests',
      label: 'My Requests',
      icon: FileText,
      matchRoutes: ['my-requests'],
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckSquare,
      matchRoutes: ['approvals'],
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: Boxes,
      matchRoutes: ['resources'],
    },
  ];

  const cfg = getRuntimeConfig();
  const filteredKinds = searchQuery.trim()
    ? RESOURCE_KIND_REGISTRY.filter(
        (k) =>
          k.display_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          k.kind.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F1F2F4] dark:bg-[#0B0D0E] text-[#1A1C1D] dark:text-slate-100">
      {/* Top Header Bar matching 17-shopify-polar-commerce */}
      <header className="h-14 px-5 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] flex items-center justify-between gap-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Toggle Left Navigation"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('catalog')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#008060] text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span
              data-testid="app-header-title"
              className="text-base font-bold tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              SPP Portal
            </span>
          </button>
        </div>

        {/* Center Region Scope & Quick Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F1F2F4] dark:bg-[#0B0D0E] border border-slate-200 dark:border-neutral-700 text-xs font-mono font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#008060]" />
            <span>GCP • us-east1</span>
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resource kinds (gcs_bucket, spanner_instance, spanner_database)..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F1F2F4] dark:bg-[#0B0D0E] border border-slate-200 dark:border-neutral-700 text-xs focus:outline-none focus:border-[#008060]"
            />
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-10 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#141719] shadow-xl p-2 z-50 space-y-1 text-xs">
                {filteredKinds.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400">No matching resource kinds.</div>
                ) : (
                  filteredKinds.map((k) => (
                    <button
                      key={k.kind}
                      type="button"
                      disabled={!k.enabled}
                      onClick={() => {
                        if (k.enabled) {
                          navigate('request-gcs-bucket');
                          setSearchQuery('');
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-between disabled:opacity-50 cursor-pointer"
                    >
                      <span className="font-semibold">{k.display_name}</span>
                      <span className="font-mono text-[11px] text-[#008060]">
                        {k.enabled ? 'Enabled' : 'Coming soon'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#008060]/10 text-[#008060] text-xs font-mono font-semibold"
            title="Control Plane API Endpoint"
          >
            <span>API: {cfg.API_BASE_URL || '/api/v1'}</span>
          </span>
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="p-2 rounded-xl border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Body with Left Navigation Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside
            data-testid="left-sidebar"
            className="w-[240px] border-r border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#141719] p-4 flex flex-col justify-between overflow-y-auto shrink-0"
          >
            <div className="space-y-5">
              {/* Primary Navigation */}
              <div className="space-y-1 text-xs">
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  SPP Portal Navigation
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.matchRoutes.includes(route);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`nav-${item.id}`}
                      onClick={() => navigate(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#008060] text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Kind Registry Shortcut Section */}
              <div className="space-y-1 text-xs pt-3 border-t border-slate-100 dark:border-neutral-800">
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Kind Registry (ADR-GLB-009)
                </div>
                {RESOURCE_KIND_REGISTRY.map((k) => {
                  const active = route === 'request-gcs-bucket' && k.kind === 'gcs_bucket';
                  const KindIcon = k.category === 'Storage' ? HardDrive : Database;
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      disabled={!k.enabled}
                      onClick={() => {
                        if (k.enabled) navigate('request-gcs-bucket');
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-[#008060]/15 text-[#008060] font-bold'
                          : k.enabled
                          ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer'
                          : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <KindIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{k.display_name}</span>
                      </span>
                      <span className="font-mono text-[10px]">
                        {k.enabled ? 'GCP' : 'Soon'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Platform Scope Card */}
            <div className="p-3 rounded-xl bg-[#F1F2F4] dark:bg-[#0B0D0E] text-xs space-y-0.5">
              <div className="font-bold">Self-Service Provisioning</div>
              <div className="text-[11px] text-slate-500 font-mono">
                SPP v1.0 • us-east1 • GCP
              </div>
            </div>
          </aside>
        )}

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto">
          {route === 'catalog' && (
            <ServiceCatalog
              onSelectKind={(kind) => {
                if (kind === 'gcs_bucket') {
                  navigate('request-gcs-bucket');
                }
              }}
            />
          )}
          {route === 'request-gcs-bucket' && (
            <GcsBucketRequestForm onBack={() => navigate('catalog')} />
          )}
          {route === 'my-requests' && (
            <EmptyStatePage
              page="requests"
              onBackToCatalog={() => navigate('catalog')}
            />
          )}
          {route === 'approvals' && (
            <EmptyStatePage
              page="approvals"
              onBackToCatalog={() => navigate('catalog')}
            />
          )}
          {route === 'resources' && (
            <EmptyStatePage
              page="resources"
              onBackToCatalog={() => navigate('catalog')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
export default App;
