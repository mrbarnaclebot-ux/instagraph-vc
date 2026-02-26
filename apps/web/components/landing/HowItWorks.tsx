const STEPS = [
  {
    number: '01',
    headline: 'Paste',
    description: 'Drop in any funding announcement, article, or URL. Supports raw text and public HTTPS sources.',
  },
  {
    number: '02',
    headline: 'Extract',
    description: 'AI identifies investors, projects, round details, narratives, and the relationships between them.',
  },
  {
    number: '03',
    headline: 'Explore',
    description: 'Interact with a live knowledge graph. Click nodes for details. Navigate connected entities.',
  },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="text-2xl font-bold text-white mb-12 text-center">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map(step => (
          <div key={step.number} className="space-y-4">
            <div className="text-5xl font-bold text-gray-800 font-mono">{step.number}</div>
            <h3 className="text-xl font-semibold text-white">{step.headline}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
