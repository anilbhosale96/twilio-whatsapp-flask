import React, { useState, useEffect, useCallback } from 'react';
import { FigmaIcon } from './FigmaIcon';
import type { AuthUser, ProductDiscoveryItem } from '../types';

interface CustomerDashboardProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  fetchPublicProducts: (params: {
    q?: string;
    category?: string;
    in_stock_only?: boolean;
    min_price?: number;
    max_price?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) => Promise<{
    success: boolean;
    products: ProductDiscoveryItem[];
    total: number;
    page: number;
    total_pages: number;
  }>;
  fetchCategories: () => Promise<Array<{ id: string; name: string; count: number }>>;
}

const CATEGORY_TABS = [
  { id: 'All', name: 'All Categories', icon: 'box' },
  { id: 'Grocery', name: 'Grocery', icon: 'bag' },
  { id: 'Pharmacy', name: 'Pharmacy', icon: 'warning' },
  { id: 'Stationery', name: 'Stationery', icon: 'edit' },
  { id: 'General Store', name: 'General Store', icon: 'inventory' },
];

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentUser,
  onLogout,
  isDark,
  onToggleDark,
  fetchPublicProducts,
  fetchCategories
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('popular');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Products and categories data
  const [products, setProducts] = useState<ProductDiscoveryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected product modal for details
  const [selectedProduct, setSelectedProduct] = useState<ProductDiscoveryItem | null>(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load category counts on mount
  useEffect(() => {
    let isMounted = true;
    fetchCategories().then((cats) => {
      if (!isMounted) return;
      const countMap: Record<string, number> = {};
      cats.forEach((c) => {
        countMap[c.id] = c.count;
      });
      setCategoryCounts(countMap);
    });
    return () => {
      isMounted = false;
    };
  }, [fetchCategories]);

  // Fetch products whenever filters change
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const minP = minPrice ? parseFloat(minPrice) : undefined;
      const maxP = maxPrice ? parseFloat(maxPrice) : undefined;

      const res = await fetchPublicProducts({
        q: debouncedQuery.trim() || undefined,
        category: selectedCategory,
        in_stock_only: inStockOnly,
        min_price: isNaN(minP as any) ? undefined : minP,
        max_price: isNaN(maxP as any) ? undefined : maxP,
        sort: sortBy,
        page,
        limit: 16
      });

      if (res.success) {
        setProducts(res.products);
        setTotalCount(res.total);
        setTotalPages(res.total_pages);
      } else {
        setErrorMsg('Unable to retrieve products. Please check your network connection.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading store products.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory, inStockOnly, minPrice, maxPrice, sortBy, page, fetchPublicProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('All');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('popular');
    setPage(1);
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'pharmacy':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'stationery':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case 'general store':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] dark:bg-[#0b1220] text-[#17213a] dark:text-[#f8fafc] flex flex-col font-sans transition-colors">
      {/* Customer Header Topbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#e5eaf2] dark:border-[#1e293b] px-4 lg:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Customer Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FigmaIcon name="box" size={17} />
              </span>
              <span className="font-extrabold text-base tracking-tight text-[#17213a] dark:text-white">
                SmartStock <b className="text-blue-600 dark:text-blue-400">AI</b>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Customer Portal
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* User Profile Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'C'}
              </span>
              <div className="hidden md:block leading-tight text-left">
                <b className="block text-[#17213a] dark:text-[#f8fafc] font-semibold text-xs">
                  {currentUser?.name || 'Customer'}
                </b>
                <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                  📍 {currentUser?.city || 'Pune, MH'}
                </span>
              </div>
            </div>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#162032] text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <FigmaIcon name={isDark ? 'sun' : 'moon'} size={16} className={isDark ? 'text-amber-400' : ''} />
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5eaf2] dark:border-[#1e293b] bg-white dark:bg-[#162032] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-xs font-semibold text-[#58657d] dark:text-[#94a3b8] transition-colors cursor-pointer"
            >
              <FigmaIcon name="logout" size={14} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6 flex-1">
        {/* Hero Search Banner */}
        <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md tracking-wide">
              LIVE LOCAL SHOP INVENTORY
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Discover Products in Nearby Shops
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Search real-time inventories, compare shop prices, and verify live stock before heading out.
            </p>

            {/* Search Input Bar */}
            <div className="pt-2">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 pointer-events-none">
                  <FigmaIcon name="search" size={18} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands, or shops (e.g. Parle G, Tata Salt, Rice, Paracetamol)..."
                  className="w-full pl-11 pr-24 py-3.5 text-sm rounded-2xl bg-white text-[#17213a] placeholder-[#94a3b8] shadow-lg focus:outline-none focus:ring-3 focus:ring-blue-300 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FigmaIcon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick search keywords */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-blue-100">
              <span className="font-semibold text-white/90">Popular:</span>
              {['Parle G', 'Tata Salt', 'Fortune Oil', 'Sugar', 'Paracetamol', 'Maggi', 'Soap'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium backdrop-blur-sm cursor-pointer transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Decorative Background Blob */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/2" />
        </section>

        {/* Category Navigation Pills */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORY_TABS.map((cat) => {
              const count = categoryCounts[cat.id] ?? (cat.id === 'All' ? totalCount : 0);
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all shadow-2xs ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                      : 'bg-white dark:bg-[#162032] border border-[#e5eaf2] dark:border-[#1e293b] text-[#58657d] dark:text-[#94a3b8] hover:text-[#17213a] dark:hover:text-white'
                  }`}
                >
                  <FigmaIcon name={cat.icon} size={15} />
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Filters and Sorting Toolbar */}
        <section className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-[#e5eaf2] dark:border-[#1e293b] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: In-Stock Toggle & Price Range */}
          <div className="flex flex-wrap items-center gap-3">
            {/* In-Stock Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-semibold text-[#17213a] dark:text-[#f8fafc]">
                In-Stock Only
              </span>
            </label>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            {/* Price Range Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#58657d] dark:text-[#94a3b8] font-medium">Price:</span>
              <input
                type="number"
                min="0"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-16 px-2 py-1 rounded-lg border border-[#dce3ee] dark:border-[#334155] bg-white dark:bg-[#162032] text-xs focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                min="0"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-16 px-2 py-1 rounded-lg border border-[#dce3ee] dark:border-[#334155] bg-white dark:bg-[#162032] text-xs focus:outline-none"
              />
            </div>

            {(searchQuery || selectedCategory !== 'All' || inStockOnly || minPrice || maxPrice) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Right: Sort Order */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[#58657d] dark:text-[#94a3b8] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#e5eaf2] dark:border-[#334155] bg-white dark:bg-[#162032] text-[#17213a] dark:text-[#f8fafc] text-xs font-semibold cursor-pointer focus:outline-none"
            >
              <option value="popular">Stock Availability</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>
          </div>
        </section>

        {/* Results Counter & Header */}
        <div className="flex items-center justify-between text-xs text-[#58657d] dark:text-[#94a3b8]">
          <span>
            {isLoading ? (
              'Searching stores...'
            ) : (
              <>
                Found <b className="text-[#17213a] dark:text-[#f8fafc]">{totalCount}</b> products{' '}
                {selectedCategory !== 'All' && <span>in <b>{selectedCategory}</b></span>}
                {debouncedQuery && <span> for &quot;<b>{debouncedQuery}</b>&quot;</span>}
              </>
            )}
          </span>
          <span>Page {page} of {totalPages}</span>
        </div>

        {/* Products Grid / Loading / Empty State */}
        {isLoading ? (
          /* Shimmer loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 bg-white dark:bg-[#111827] border border-[#e5eaf2] dark:border-[#1e293b] space-y-3 animate-pulse"
              >
                <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : errorMsg ? (
          /* Error State */
          <div className="p-8 text-center bg-white dark:bg-[#111827] rounded-3xl border border-red-200 dark:border-red-900 space-y-3">
            <FigmaIcon name="warning" size={32} className="mx-auto text-red-500" />
            <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc]">Error Loading Products</h3>
            <p className="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">{errorMsg}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="btn btn-primary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Retry Search
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Empty Results State */
          <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-3xl border border-dashed border-[#e5eaf2] dark:border-[#1e293b] space-y-4">
            <span className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FigmaIcon name="search" size={28} />
            </span>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#17213a] dark:text-[#f8fafc]">No matching products found</h3>
              <p className="text-xs text-[#58657d] dark:text-[#94a3b8] max-w-sm mx-auto">
                We couldn&apos;t find any products matching &quot;{debouncedQuery || selectedCategory}&quot;. Try checking for spelling or resetting your filters.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
            >
              View All Store Products
            </button>
          </div>
        ) : (
          /* Product Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((item) => (
              <article
                key={`${item.id}-${item.store.name}`}
                className="group rounded-2xl bg-white dark:bg-[#111827] border border-[#e5eaf2] dark:border-[#1e293b] overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
                onClick={() => setSelectedProduct(item)}
              >
                {/* Product Image Container */}
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Category Pill */}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs ${getCategoryBadgeClass(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>

                  {/* Stock Status Badge */}
                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      item.stock_status === 'in_stock'
                        ? 'bg-emerald-500 text-white'
                        : item.stock_status === 'low_stock'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    {item.stock_status === 'in_stock'
                      ? `In Stock (${item.qty} ${item.unit})`
                      : item.stock_status === 'low_stock'
                      ? `Low (${item.qty} left)`
                      : 'Out of Stock'}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#17213a] dark:text-[#f8fafc] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <span className="text-[11px] text-[#58657d] dark:text-[#94a3b8]">
                      Unit: {item.unit}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline justify-between pt-1 border-t border-[#f1f5f9] dark:border-[#1e293b]">
                    <div>
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {item.price_formatted}
                      </span>
                      {item.price && (
                        <span className="text-[10px] text-[#58657d] dark:text-[#94a3b8]"> / {item.unit}</span>
                      )}
                    </div>
                  </div>

                  {/* Store Details Footer */}
                  <div className="pt-2 border-t border-[#f1f5f9] dark:border-[#1e293b] flex items-center justify-between text-[11px] text-[#58657d] dark:text-[#94a3b8]">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <FigmaIcon name="bag" size={13} className="text-slate-400 shrink-0" />
                      <span className="font-medium truncate text-[#17213a] dark:text-[#cbd5e1]">
                        {item.store.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.store.location}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs font-semibold text-[#58657d] dark:text-[#94a3b8] px-3">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-[#e5eaf2] dark:border-[#1e293b] overflow-hidden">
            {/* Modal Image */}
            <div className="relative h-52 bg-slate-100 dark:bg-slate-800">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer transition-colors"
              >
                <FigmaIcon name="close" size={16} />
              </button>
              <span
                className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${
                  selectedProduct.stock_status === 'in_stock'
                    ? 'bg-emerald-500 text-white'
                    : selectedProduct.stock_status === 'low_stock'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-600 text-white'
                }`}
              >
                {selectedProduct.stock_status === 'in_stock'
                  ? `In Stock: ${selectedProduct.qty} ${selectedProduct.unit}`
                  : selectedProduct.stock_status === 'low_stock'
                  ? `Low Stock: Only ${selectedProduct.qty} left`
                  : 'Currently Out of Stock'}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#17213a] dark:text-[#f8fafc]">
                    {selectedProduct.name}
                  </h2>
                  <span className="text-xs text-[#58657d] dark:text-[#94a3b8]">
                    Category: <b>{selectedProduct.category}</b> · Unit: <b>{selectedProduct.unit}</b>
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {selectedProduct.price_formatted}
                  </div>
                  <small className="text-[10px] text-slate-400">Live store rate</small>
                </div>
              </div>

              {/* Store & Contact Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#162032] border border-[#e2e8f0] dark:border-[#1e293b] space-y-2 text-xs">
                <b className="text-[#17213a] dark:text-[#f8fafc] flex items-center gap-1.5">
                  <FigmaIcon name="bag" size={15} className="text-blue-500" />
                  Available at {selectedProduct.store.name}
                </b>
                <div className="space-y-1 text-[#58657d] dark:text-[#94a3b8]">
                  <p>Shopkeeper: <b>{selectedProduct.store.owner}</b></p>
                  <p>Store Category: <b>{selectedProduct.store.category}</b></p>
                  <p>Verified WhatsApp: <code className="font-mono">{selectedProduct.store.phone_masked}</code></p>
                  <p>Location: <b>{selectedProduct.store.location}</b></p>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="btn btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Close Product Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
