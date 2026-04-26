import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRestaurantById } from '../api'
import RatingBadge from '../components/RatingBadge'
import SimilarRestaurants from '../components/SimilarRestaurants'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'

const PRICE_LABELS = { 1: 'Budget', 2: 'Moderate', 3: 'Upscale', 4: 'Premium' }

export default function RestaurantDetail() {
  const { id } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getRestaurantById(id)
      .then(r => setRestaurant(r.data))
      .catch(() => setError('Restaurant not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-72 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">{error || 'Something went wrong.'}</p>
          <Link to="/" className="mt-4 inline-block text-orange-500 hover:underline">← Back to search</Link>
        </div>
      </div>
    )
  }

  const r = restaurant

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-orange-500 hover:underline mb-6 inline-block">← Back to search</Link>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="h-72 overflow-hidden bg-gray-100">
            <img
              src={r.featured_image || PLACEHOLDER}
              alt={r.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.src = PLACEHOLDER }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{r.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <RatingBadge rating={r.aggregate_rating} text={r.rating_text} />
                {r.votes > 0 && (
                  <span className="text-sm text-gray-400">({r.votes.toLocaleString()} votes)</span>
                )}
              </div>
            </div>

            <p className="text-gray-500 mb-1">{r.cuisines}</p>
            <p className="text-gray-400 text-sm mb-4">
              {r.locality}{r.city ? `, ${r.city}` : ''}
              {r.address ? ` — ${r.address}` : ''}
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              {r.average_cost_for_two > 0 && (
                <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
                  💰 {r.currency || '₹'}{r.average_cost_for_two.toLocaleString()} for two
                </span>
              )}
              {r.price_range && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {PRICE_LABELS[r.price_range] || ''}
                </span>
              )}
              {r.has_online_delivery === 1 && (
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">🛵 Online Delivery</span>
              )}
              {r.has_table_booking === 1 && (
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">📅 Table Booking</span>
              )}
            </div>

            {r.zomato_url && (
              <a
                href={r.zomato_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm text-orange-500 hover:underline"
              >
                View on Zomato →
              </a>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Similar Restaurants</h2>
          <SimilarRestaurants restaurantId={id} />
        </div>
      </div>
    </div>
  )
}
