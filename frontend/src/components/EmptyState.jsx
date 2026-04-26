export default function EmptyState({ message = 'No restaurants found.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <span className="text-5xl mb-4">🍽️</span>
      <p className="text-lg">{message}</p>
      <p className="text-sm mt-1">Try adjusting your filters.</p>
    </div>
  )
}
