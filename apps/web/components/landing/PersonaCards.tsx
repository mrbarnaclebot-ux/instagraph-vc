const PERSONAS = [
  {
    role: 'Analyst',
    tagline: 'Track which funds lead which rounds across 100+ deals',
    detail: 'Build deal sourcing pipelines. Spot emerging investors before they go mainstream. Export to your stack.',
  },
  {
    role: 'Founder',
    tagline: "See who's invested in your competitors before you pitch",
    detail: 'Understand fund thesis alignment. Identify warm intro paths. Map the ecosystem before your raise.',
  },
  {
    role: 'Journalist',
    tagline: 'Map the investor network behind any narrative in minutes',
    detail: "Trace the capital flow in any sector story. Visualize co-investment patterns. Export graphs for your readers.",
  },
]

export default function PersonaCards() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 border-t border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-12 text-center">Built for every lens on the market</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PERSONAS.map(p => (
          <div
            key={p.role}
            className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-3 hover:border-gray-700 transition-colors"
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">{p.role}</div>
            <p className="text-white font-medium leading-snug">{p.tagline}</p>
            <p className="text-gray-500 text-sm leading-relaxed">{p.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
