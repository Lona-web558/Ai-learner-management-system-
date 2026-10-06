const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---- In-memory data (swap for a database later) ----
const courses = [
  { id: 1, title: 'JavaScript Foundations', level: 'Beginner', summary: 'Variables, functions and the DOM, step by step.',
    lessons: [
      { id: 101, title: 'Variables and types', body: 'Use let and const to declare variables. JavaScript has strings, numbers, booleans, objects, null and undefined.' },
      { id: 102, title: 'Functions', body: 'A function groups reusable logic. Arrow functions like (a, b) => a + b are short, and functions can be passed as values.' },
      { id: 103, title: 'The DOM', body: 'The DOM is the page as objects. Use document.querySelector to find elements and addEventListener to react to clicks.' }],
    quiz: [
      { q: 'Which keyword declares a variable that cannot be reassigned?', options: ['let', 'const', 'var'], answer: 1 },
      { q: 'Which method finds an element by CSS selector?', options: ['document.querySelector', 'window.find', 'dom.get'], answer: 0 }] },
  { id: 2, title: 'Node.js and Express', level: 'Intermediate', summary: 'Build REST APIs and serve web apps.',
    lessons: [
      { id: 201, title: 'Routing', body: 'Express routes match an HTTP method and path, such as app.get("/api/items", handler). Handlers receive req and res.' },
      { id: 202, title: 'Middleware', body: 'Middleware runs between request and response. express.json() parses JSON bodies; express.static serves files.' }],
    quiz: [
      { q: 'What does express.json() do?', options: ['Serves static files', 'Parses JSON request bodies', 'Connects to a database'], answer: 1 }] },
  { id: 3, title: 'Data Literacy', level: 'Beginner', summary: 'Read charts, spot bias, ask better questions.',
    lessons: [
      { id: 301, title: 'Reading charts', body: 'Check axes, units and scale first. A truncated y-axis can make small differences look large.' },
      { id: 302, title: 'Spotting bias', body: 'Sampling bias happens when the people measured differ from the group you care about. Ask who is missing from the data.' }],
    quiz: [
      { q: 'What is sampling bias?', options: ['A sample that misrepresents the group', 'A very large sample', 'A random sample'], answer: 0 }] }
];
const me = { name: 'Learner', enrolled: new Set(), done: new Set(), scores: {} };

const pub = c => ({ id: c.id, title: c.title, level: c.level, summary: c.summary, lessons: c.lessons, quizCount: c.quiz.length });
const find = id => courses.find(c => c.id === Number(id));

app.get('/api/courses', (req, res) => res.json(courses.map(pub)));
app.get('/api/courses/:id', (req, res) => {
  const c = find(req.params.id);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  res.json({ ...pub(c), quiz: c.quiz.map(({ q, options }) => ({ q, options })) });
});
app.get('/api/me', (req, res) => res.json({ name: me.name, enrolled: [...me.enrolled], done: [...me.done], scores: me.scores }));
app.post('/api/courses/:id/enroll', (req, res) => {
  if (!find(req.params.id)) return res.status(404).json({ error: 'Course not found' });
  me.enrolled.add(Number(req.params.id)); res.json({ ok: true });
});
app.post('/api/lessons/:id/complete', (req, res) => { me.done.add(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/courses/:id/quiz', (req, res) => {
  const c = find(req.params.id);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  const answers = req.body.answers || [];
  const correct = c.quiz.filter((q, i) => answers[i] === q.answer).length;
  me.scores[c.id] = Math.round((correct / c.quiz.length) * 100);
  res.json({ correct, total: c.quiz.length, score: me.scores[c.id] });
});

// ---- AI tutor: uses Claude if ANTHROPIC_API_KEY is set, otherwise a simple local fallback ----
app.post('/api/tutor', async (req, res) => {
  const { message = '', courseId } = req.body;
  const c = find(courseId);
  const context = c ? c.lessons.map(l => `${l.title}: ${l.body}`).join('\n') : courses.flatMap(x => x.lessons).map(l => `${l.title}: ${l.body}`).join('\n');
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-4-6', max_tokens: 500,
          system: `You are a friendly tutor in a learning platform. Explain simply, use short examples, and ask one check-for-understanding question. Course material:\n${context}`,
          messages: [{ role: 'user', content: message }] })
      });
      const data = await r.json();
      return res.json({ reply: data.content?.[0]?.text || 'The tutor could not answer. Try again.' });
    } catch (e) { return res.status(502).json({ reply: 'Could not reach the AI service. Check your connection and API key.' }); }
  }
  const words = message.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const lessons = (c ? c.lessons : courses.flatMap(x => x.lessons));
  const best = lessons.map(l => ({ l, s: words.filter(w => (l.title + l.body).toLowerCase().includes(w)).length })).sort((a, b) => b.s - a.s)[0];
  res.json({ reply: best && best.s ? `From "${best.l.title}": ${best.l.body}\n\n(Set ANTHROPIC_API_KEY to get full AI answers.)` : 'I could not find that in the course material. Try a keyword from a lesson, or set ANTHROPIC_API_KEY for full AI answers.' });
});


app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI LMS running on http://localhost:${PORT}`));
