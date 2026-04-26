import { Link } from 'react-router-dom'
import RatingBadge from './RatingBadge'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

export default function RestaurantCard({ restaurant: r, reasons }) {
  return (
    <Link
      to={`/restaurant/${r.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      <div className="h-44 overflow-hidden bg-gray-100">
        <img
          src={r.featured_image || PLACEHOLDER}
          alt={r.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = PLACEHOLDER }}
        />
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 leading-tight line-clamp-1">{r.name}</h3>
          <RatingBadge rating={r.aggregate_rating} text={r.rating_text} />
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{r.cuisines}</p>
        <p className="text-xs text-gray-400 line-clamp-1">{r.locality}{r.city ? `, ${r.city}` : ''}</p>

        {reasons && reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reasons.map(cat => (
              <span
                key={cat}
                className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-gray-500">
          {r.average_cost_for_two
            ? <span>{r.currency || '$'}{r.average_cost_for_two.toLocaleString()} for two</span>
            : <span />
          }
          <div className="flex gap-2">
            {r.has_online_delivery === 1 && <span title="Delivery">🛵</span>}
            {r.has_table_booking === 1 && <span title="Table booking">📅</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
