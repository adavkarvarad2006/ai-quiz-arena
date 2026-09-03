function trendIcon(trend) {
  if (trend === "up") return <span className="text-green-600">↑</span>;
  if (trend === "down") return <span className="text-red-600">↓</span>;
  if (trend === "new") return <span className="text-blue-500">•</span>;
  return <span className="text-gray-300">–</span>;
}

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

function Leaderboard({ entries, title = "Leaderboard" }) {
  return (
    <div>
      {title && <h3 className="font-semibold text-sm mb-2">{title}</h3>}
      <div className="space-y-1">
        {entries.map((p) => (
          <div
            key={p.userId}
            className="flex items-center justify-between text-sm py-1 transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              <span className="w-6 text-center">{medal(p.rank)}</span>
              <span>{p.name}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-semibold">{p.score}</span>
              {trendIcon(p.trend)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Leaderboard;