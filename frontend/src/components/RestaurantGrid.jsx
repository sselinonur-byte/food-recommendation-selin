import RestaurantCard from './RestaurantCard'
import EmptyState from './EmptyState'

export default function RestaurantGrid({ restaurants, total, loading, onLoadMore, page, limit = 20 }) {
  if (!loading && restaurants.length === 0) {
    return <EmptyState />
  }

  const hasMore = restaurants.length < total

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 mb-4">
        {loading && restaurants.length === 0
          ? 'Loading…'
          : `Showing ${restaurants.length} of ${total} restaurants`
        }
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm h-64 animate-pulse" />
        ))}
      </div>
      {!loading && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
