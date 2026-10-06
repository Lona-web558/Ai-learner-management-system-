const $ = s => document.querySelector(s);
const view = $('#view');
const api = (url, body) => fetch(url, body ? {
    method: 'POST', headers: {
        'content-type': 'application/json'
    }, body: JSON.stringify(body)
}: {}).then(r => r.json());
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pct = (c, me) => Math.round(100 * c.lessons.filter(l => me.done.includes(l.id)).length / c.lessons.length);

    async function home() {
    const [courses, me] = await Promise.all([api('/api/courses'), api('/api/me')]);
    const mine = courses.filter(c => me.enrolled.includes(c.id));
    view.innerHTML = `<h1 class="h3 mb-3">My learning</h1>` + (mine.length ? mine.map(c => `
        <a class="panel d-block text-decoration-none text-reset mb-3" href="#/course/${c.id}">
        <div class="d-flex justify-content-between"><strong>${esc(c.title)}</strong><span>${pct(c, me)}%</span></div>
        <div class="progress mt-2"><div class="progress-bar" style="width:${pct(c, me)}%"></div></div>
        ${me.scores[c.id] != null ? `<small>Quiz score: ${me.scores[c.id]}%</small>`: ''}</a>`).join(''): `<div class="panel">You are not enrolled in any course yet. <a href="#/courses">Browse courses</a> to start.</div>`);
    }

    async function courseList() {
    const [courses, me] = await Promise.all([api('/api/courses'), api('/api/me')]);
    view.innerHTML = `<h1 class="h3 mb-3">Courses</h1><div class="row g-3">` + courses.map(c => `
        <div class="col-md-6"><div class="panel h-100 d-flex flex-column">
        <span class="badge text-bg-warning align-self-start mb-2">${esc(c.level)}</span>
        <h2 class="h5">${esc(c.title)}</h2><p>${esc(c.summary)}</p>
        <div class="mt-auto"><a class="btn btn-teal btn-sm" href="#/course/${c.id}">${me.enrolled.includes(c.id) ? 'Continue': 'View course'}</a></div>
        </div></div>`).join('') + `</div>`;
    }

    async function course(id) {
    const [c, me] = await Promise.all([api('/api/courses/' + id), api('/api/me')]);
    const enrolled = me.enrolled.includes(c.id);
    view.innerHTML = `<h1 class="h3">${esc(c.title)}</h1><p>${esc(c.summary)}</p>
    ${enrolled ? `<div class="progress mb-4"><div class="progress-bar" style="width:${pct(c, me)}%"></div></div>`: `<button class="btn btn-teal mb-4" id="enroll">Enroll in this course</button>`}
    ${c.lessons.map(l => `<div class="lesson mb-3 ${me.done.includes(l.id) ? 'done': ''}"><h2 class="h6">${esc(l.title)}</h2><p class="mb-1">${esc(l.body)}</p>
        ${enrolled && !me.done.includes(l.id) ? `<button class="btn btn-outline-secondary btn-sm" data-done="${l.id}">Mark complete</button>`: me.done.includes(l.id) ? '<small>Completed</small>': ''}</div>`).join('')}
    ${enrolled ? `<h2 class="h5 mt-4">Quiz</h2><form id="quiz" class="panel">${c.quiz.map((q, i) => `<fieldset class="mb-3"><legend class="fs-6">${esc(q.q)}</legend>${q.options.map((o, j) => `
        <div class="form-check"><input class="form-check-input" type="radio" name="q${i}" id="q${i}-${j}" value="${j}"><label class="form-check-label" for="q${i}-${j}">${esc(o)}</label></div>`).join('')}</fieldset>`).join('')}
    <button class="btn btn-teal">Submit answers</button><span id="result" class="ms-3" role="status"></span></form>
    <a class="d-inline-block mt-3" href="#/tutor/${c.id}">Ask the AI tutor about this course</a>`: ''}`;
    $('#enroll')?.addEventListener('click', async () => {
        await api(`/api/courses/${id}/enroll`, {}); course(id);
    });
    view.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', async () => {
        await api(`/api/lessons/${b.dataset.done}/complete`, {}); course(id);
    }));
    $('#quiz')?.addEventListener('submit', async e => {
        e.preventDefault();
        const answers = c.quiz.map((_, i) => {
            const x = new FormData(e.target).get('q' + i); return x === null ? -1: Number(x);
        });
        const r = await api(`/api/courses/${id}/quiz`, {
            answers
        });
        $('#result').textContent = `You got ${r.correct} of ${r.total} (${r.score}%)`;
    });
    }

    function tutor(courseId) {
    view.innerHTML = `<h1 class="h3 mb-3">AI tutor</h1><div class="panel">
    <div class="chat mb-3" id="chat" aria-live="polite"><div class="msg ai">Ask me anything about your courses. I will explain it simply.</div></div>
    <form class="input-group" id="ask"><input class="form-control" id="q" placeholder="e.g. What is middleware?" aria-label="Your question" required><button class="btn btn-teal">Ask tutor</button></form></div>`;
    $('#ask').addEventListener('submit', async e => {
        e.preventDefault();
        const q = $('#q').value.trim(); if (!q) return; $('#q').value = '';
        const chat = $('#chat');
        chat.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(q)}</div>`);
        const wait = document.createElement('div'); wait.className = 'msg ai'; wait.textContent = 'Thinking…'; chat.append(wait);
        const r = await api('/api/tutor', {
            message: q, courseId
        }).catch(() => ({
                reply: 'Network error. Check that the server is running.'
            }));
        wait.textContent = r.reply; chat.scrollTop = chat.scrollHeight;
    });
    }

    function route() {
    const [, page, arg] = location.hash.split('/');
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (page || 'home') || (page === 'course' && a.dataset.nav === 'courses')));
    if (page === 'courses') courseList(); else if (page === 'course') course(arg); else if (page === 'tutor') tutor(arg); else home();
    view.focus();
    }
    addEventListener('hashchange', route); route();