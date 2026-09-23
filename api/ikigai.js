// Vercel Serverless Function: /api/ikigai
// Der API-Key liegt ausschließlich als Umgebungsvariable ANTHROPIC_API_KEY bei Vercel – nie im Browser.

const MAX_LEN = 800; // Zeichen pro Feld – begrenzt Kosten und Missbrauch

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Nur Anfragen von der eigenen Domain zulassen
  const origin = req.headers.origin || '';
  if (origin && !/^https:\/\/(www\.)?commnsense\.de$/.test(origin) && !origin.endsWith('.vercel.app')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const fields = ['gut', 'gerne', 'welt', 'geld'];
  const input = {};
  for (const f of fields) {
    const v = String(body[f] || '').trim().slice(0, MAX_LEN);
    if (!v) return res.status(400).json({ error: 'Alle vier Felder sind erforderlich.' });
    input[f] = v;
  }

  const prompt = `Du bist ein erfahrener systemischer Coach und arbeitest mit dem IKIGAI-Modell.
Eine Person hat vier Fragen beantwortet. Werte die Antworten aus – konkret, persönlich, in Du-Form, auf Deutsch.
Keine Floskeln, keine Esoterik, keine Heilsversprechen. Beziehe dich wörtlich auf die Eingaben.

Eingaben:
- Was ich gut kann: ${input.gut}
- Was ich gerne mache: ${input.gerne}
- Was die Welt von mir braucht: ${input.welt}
- Womit ich Geld verdienen kann: ${input.geld}

Liefere:
1. Die vier Schnittmengen, je 2–3 Sätze:
   - passion (Leidenschaft = gut können × gerne machen)
   - mission (Mission = gerne machen × Welt braucht)
   - profession (Beruf = gut können × Geld verdienen)
   - vocation (Berufung = Welt braucht × Geld verdienen)
2. purposeTitle: der zentrale Purpose als ein prägnanter Leitsatz
3. purposeText: 3–4 Sätze Erläuterung, inklusive der größten Lücke oder Spannung zwischen den Feldern
4. question: eine offene, herausfordernde Frage, die sich lohnt, im Coaching zu vertiefen

Antworte ausschließlich als JSON ohne Markdown:
{"passion":"...","mission":"...","profession":"...","vocation":"...","purposeTitle":"...","purposeText":"...","question":"..."}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()).slice(0, 300));
    const data = await r.json();
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'Analyse derzeit nicht verfügbar.' });
  }
};
