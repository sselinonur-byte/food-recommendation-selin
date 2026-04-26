import { useEffect, useState } from 'react'
import { getCities, getCuisines } from '../api'
import { useFilters } from '../context/FilterContext'

export default function SearchPanel() {
  const { state, setFilter, search } = useFilters()
  const [cities, setCities] = useState([])
  const [cuisines, setCuisines] = useState([])

  useEffect(() => {
    getCities().then(r => setCities(r.data))
    getCuisines().then(r => setCuisines(r.data))
  }, [])

  const filters = {
    query: state.query,
    city: state.city,
    cuisine: state.cuisine,
    minRating: state.minRating,
    maxCost: state.maxCost,
    delivery: state.delivery,
    booking: state.booking,
  }

  function handle(key, val) {
    const updated = { ...filters, [key]: val }
    setFilter({ [key]: val })
    search(updated, 1)
  }

  return (
    <aside className="w-64 shrink-0 space-y-5">
      <h2 className="text-lg font-semibold text-gray-700">Filters</h2>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
        <select
          value={state.city}
          onChange={e => handle('city', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Cuisine</label>
        <select
          value={state.cuisine}
          onChange={e => handle('cuisine', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All cuisines</option>
          {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Min Rating: {state.minRating > 0 ? state.minRating : 'Any'}
        </label>
        <input
          type="range" min="0" max="5" step="0.5"
          value={state.minRating}
          onChange={e => handle('minRating', parseFloat(e.target.value))}
          className="w-full accent-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Max Budget (for two)</label>
        <input
          type="number" placeholder="e.g. 1000"
          value={state.maxCost}
          onChange={e => handle('maxCost', e.target.value ? parseInt(e.target.value) : '')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={state.delivery}
            onChange={e => handle('delivery', e.target.checked)}
            className="accent-orange-500"
          />
          Online Delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={state.booking}
            onChange={e => handle('booking', e.target.checked)}
            className="accent-orange-500"
          />
          Table Booking
        </label>
      </div>

      <button
        onClick={() => {
          setFilter({
            city: '', cuisine: '', minRating: 0, maxCost: '',
            delivery: false, booking: false, query: '',
          })
          search({}, 1)
        }}
        className="w-full text-sm text-orange-600 underline hover:text-orange-800"
      >
        Clear all filters
      </button>
    </aside>
  )
}
