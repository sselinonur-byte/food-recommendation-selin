import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSimilarRestaurants } from '../api'
import RatingBadge from './RatingBadge'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

export default function SimilarRestaurants({ restaurantId }) {
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSimilarRestaurants(restaurantId, 10)
      .then(r => setSimilar(r.data))
      .finally(() => setLoading(false))
  }, [restaurantId])

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-48 shrink-0 h-52 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (similar.length === 0) return null

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {similar.map(r => (
        <Link
          key={r.id}
          to={`/restaurant/${r.id}`}
          className="w-48 shrink-0 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="h-28 overflow-hidden bg-gray-100">
            <img
              src={r.featured_image || PLACEHOLDER}
              alt={r.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.src = PLACEHOLDER }}
            />
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{r.name}</p>
            <p className="text-xs text-gray-400 line-clamp-1 mb-1">{r.cuisines}</p>
            <RatingBadge rating={r.aggregate_rating} text={r.rating_text} />
          </div>
        </Link>
      ))}
    </div>
  )
}
