import { useEffect, useRef, useState } from 'react'
import { useFilters } from '../context/FilterContext'
import SearchPanel from '../components/SearchPanel'
import RestaurantGrid from '../components/RestaurantGrid'
import PersonalizedSection from '../components/PersonalizedSection'

export default function Home() {
  const { state, search, setFilter, loadMore } = useFilters()
  const didInit = useRef(false)
  const [mode, setMode] = useState('browse') // 'browse' | 'personalized'

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      search({}, 1)
    }
  }, [search])

  useEffect(() => {
    if (state.page > 1) {
      search({
        query: state.query,
        city: state.city,
        cuisine: state.cuisine,
        minRating: state.minRating,
        maxCost: state.maxCost,
        delivery: state.delivery,
        booking: state.booking,
      }, state.page)
    }
  }, [state.page])

  function handleSearch(e) {
    e.preventDefault()
    search({
      query: state.query,
      city: state.city,
      cuisine: state.cuisine,
      minRating: state.minRating,
      maxCost: state.maxCost,
      delivery: state.delivery,
      booking: state.booking,
    }, 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <span className="text-2xl font-bold text-orange-500">Food Finder</span>
          {mode === 'browse' && (
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <input
                type="search"
                placeholder="Search restaurants or cuisines…"
                value={state.query}
                onChange={e => setFilter({ query: e.target.value })}
                className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </form>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit mb-8">
          <button
            onClick={() => setMode('browse')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'browse'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse all
          </button>
          <button
            onClick={() => setMode('personalized')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'personalized'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Personalized ✦
          </button>
        </div>

        {mode === 'personalized' && <PersonalizedSection />}

        {mode === 'browse' && (
          <div className="flex gap-8">
            <SearchPanel />
            <RestaurantGrid
              restaurants={state.results}
              total={state.total}
              loading={state.loading}
              onLoadMore={loadMore}
              page={state.page}
            />
          </div>
        )}

      </main>
    </div>
  )
}
