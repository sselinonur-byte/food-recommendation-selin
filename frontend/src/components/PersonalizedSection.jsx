import { useState, useEffect } from 'react'
import { getRecommendations, getSampleUsers, getCities, getCuisines } from '../api'
import RestaurantCard from './RestaurantCard'

const PRICE_LABELS = { 1: '$ Budget', 2: '$$ Moderate', 3: '$$$ Upscale', 4: '$$$$ Premium' }

const initialFilters = {
  city: '', cuisine: '', minRating: '', maxCost: '',
  priceRange: '', delivery: false, booking: false, openOnly: false,
}

export default function PersonalizedSection() {
  const [userId, setUserId]       = useState('')
  const [input, setInput]         = useState('')
  const [filters, setFilters]     = useState(initialFilters)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [sampleUsers, setSampleUsers] = useState([])
  const [cities, setCities]       = useState([])
  const [cuisines, setCuisines]   = useState([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    getSampleUsers().then(r => setSampleUsers(r.data || [])).catch(() => {})
    getCities().then(r => setCities(r.data || [])).catch(() => {})
    getCuisines().then(r => setCuisines(r.data || [])).catch(() => {})
  }, [])

  function fetch(uid, f = filters) {
    const id = (uid || userId).trim()
    if (!id) return
    setUserId(id)
    setLoading(true)
    setError(null)
    getRecommendations(id, f, 10)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load recommendations.'))
      .finally(() => setLoading(false))
  }

  function submitUser(uid) {
    const id = (uid || input).trim()
    if (!id) return
    setInput(id)
    setUserId(id)
    fetch(id, filters)
  }

  function updateFilter(key, val) {
    const updated = { ...filters, [key]: val }
    setFilters(updated)
    if (userId) fetch(userId, updated)
  }

  function clearFilters() {
    setFilters(initialFilters)
    if (userId) fetch(userId, initialFilters)
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    v !== '' && v !== false && v !== initialFilters[k]
  ).length

  return (
    <section className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-6 mb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Personalized for you</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            SVD model trained on 3.88M Yelp reviews — enter a user ID then refine with filters.
          </p>
        </div>
        {data && (
          <div className="shrink-0 text-right">
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
              data.personalized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {data.personalized ? `SVD · ${data.review_count} reviews` : 'Top rated fallback'}
            </span>
            {data.personalized && (
              <p className="text-xs text-gray-400 mt-1">
                {data.after_filters} of {data.candidate_pool} candidates match filters
              </p>
            )}
          </div>
        )}
      </div>

      {/* User ID input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Paste a Yelp user ID…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitUser()}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        />
        <button
          onClick={() => submitUser()}
          disabled={loading}
          className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : 'Go'}
        </button>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
          }`}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      {/* Sample user chips */}
      {sampleUsers.length > 0 && !data && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs text-gray-400 self-center">Try a sample user:</span>
          {sampleUsers.slice(0, 5).map(u => (
            <button
              key={u.user_id}
              onClick={() => { setInput(u.user_id); submitUser(u.user_id) }}
              className="text-xs bg-white border border-orange-200 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-50 transition-colors"
            >
              {u.user_id.slice(0, 10)}… ({u.review_count} reviews)
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white border border-orange-100 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
            <select
              value={filters.city}
              onChange={e => updateFilter('city', e.target.value)}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Any city</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cuisine</label>
            <select
              value={filters.cuisine}
              onChange={e => updateFilter('cuisine', e.target.value)}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Any cuisine</option>
              {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Price range</label>
            <select
              value={filters.priceRange}
              onChange={e => updateFilter('priceRange', e.target.value ? parseInt(e.target.value) : '')}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Any price</option>
              {[1, 2, 3, 4].map(p => <option key={p} value={p}>{PRICE_LABELS[p]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min rating</label>
            <select
              value={filters.minRating}
              onChange={e => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Any rating</option>
              {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>★ {r}+</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max cost (for two)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={filters.maxCost}
              onChange={e => updateFilter('maxCost', e.target.value ? parseInt(e.target.value) : '')}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.delivery}
                onChange={e => updateFilter('delivery', e.target.checked)}
                className="accent-orange-500" />
              Delivery
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.booking}
                onChange={e => updateFilter('booking', e.target.checked)}
                className="accent-orange-500" />
              Table booking
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={filters.openOnly}
                onChange={e => updateFilter('openOnly', e.target.checked)}
                className="accent-orange-500" />
              Open now
            </label>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-xs text-orange-600 underline hover:text-orange-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {/* Taste profile strip */}
      {data && data.personalized && data.user_top_categories?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500">Your taste profile:</span>
          {data.user_top_categories.map(cat => (
            <span key={cat} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full shadow-sm">
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-56 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && data && data.results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.results.map(r => (
            <RestaurantCard key={r.id} restaurant={r} reasons={r.reasons} />
          ))}
        </div>
      )}

      {!loading && data && data.results.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          No personalized results match these filters — try relaxing them.
        </p>
      )}
    </section>
  )
}
