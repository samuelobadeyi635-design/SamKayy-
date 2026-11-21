/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { CartProvider } from './context/CartContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { FeedsPage } from './pages/FeedsPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { QuantityPage } from './pages/QuantityPage';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  PickupDeliveryPage,
  PrivacyPage,
  TermsPage,
} from './pages/SupportPages';
import type { AdminUser, BusinessSettings } from './types';

function AppShell() {
  const { pathname, navigate } = useRouter();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const loadSettings = useCallback(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isAdminArea = pathname.startsWith('/admin');

  if (pathname === '/admin/login') {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafaf8] text-[#18221d]">
        <Navbar settings={settings} />
        <main className="flex-1">
          <AdminLoginPage onAuthenticated={(u) => setAdminUser(u)} />
        </main>
      </div>
    );
  }

  if (isAdminArea) {
    const sub = pathname.replace(/^\/admin\/?/, '') || 'dashboard';
    const validSections = [
      'dashboard',
      'products',
      'categories',
      'pricing',
      'discounts',
      'inventory',
      'settings',
      'analytics',
    ] as const;
    const section = validSections.includes(sub as (typeof validSections)[number])
      ? (sub as (typeof validSections)[number])
      : 'dashboard';

    return (
      <AdminDashboardPage
        section={section}
        adminUser={adminUser}
        onLogout={() => setAdminUser(null)}
        onSettingsUpdated={loadSettings}
      />
    );
  }

  let content: React.ReactNode;
  if (pathname === '/') {
    content = <HomePage settings={settings} />;
  } else if (pathname === '/feeds') {
    content = <FeedsPage />;
  } else if (pathname.startsWith('/feeds/')) {
    const slug = decodeURIComponent(pathname.slice('/feeds/'.length));
    content = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/quantity') {
    content = <QuantityPage settings={settings} />;
  } else if (pathname === '/about') {
    content = <AboutPage settings={settings} />;
  } else if (pathname === '/contact') {
    content = <ContactPage settings={settings} />;
  } else if (pathname === '/faq') {
    content = <FaqPage />;
  } else if (pathname === '/pickup-delivery') {
    content = <PickupDeliveryPage settings={settings} />;
  } else if (pathname === '/privacy') {
    content = <PrivacyPage />;
  } else if (pathname === '/terms') {
    content = <TermsPage />;
  } else {
    content = (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#18221d]">Page Not Found</h1>
        <p className="text-sm text-[#525b56]">The page you requested could not be found.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-3 rounded-lg bg-[#0f6b5e] text-white text-sm font-semibold min-h-[44px]"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8] text-[#18221d]">
      <Navbar settings={settings} />
      <main className="flex-1">{content}</main>
      <Footer settings={settings} />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </RouterProvider>
  );
}
