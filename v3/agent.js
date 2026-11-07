(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  /* ================= the agent ================= */
  const kbEl = $('#kb');
  const log = $('#console-log');
  if (!kbEl || !log) return;
  const KB = JSON.parse(kbEl.textContent);
  const consoleEl = $('.console'), stateEl = $('#console-state');
  const form = $('#console-form'), input = $('#console-input');
  let busy = false;

  const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s+-]/g, ' ');
  const words = (s) => norm(s).split(/\s+/).filter(Boolean);
  const has = (q, list) => list.some((k) => q.includes(k));
  const listJoin = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const NUM = ['zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven'];
  const cap = (n) => NUM[n] || String(n);

  const TOPICS = {
    mcp: ['mcp', 'model context', 'server'],
    rag: ['rag', 'retrieval', 'knowledge', 'vector', 'pgvector'],
    network: ['network', 'router', 'cisco', 'bgp', 'device', 'cli', 'netmiko', 'ios'],
    agents: ['agent', 'agentic'],
    slack: ['slack'],
    webex: ['webex'],
    nlp: ['nlp', 'deep learning', 'classifier'],
    automation: ['automation', 'automate', 'migration', 'mop'],
    search: ['search'],
    hackathon: ['hackathon'],
  };

  /* Tools. Each returns { args, hits: [[label, right]], answer } */
  const T = {
    search_projects(q) {
      let topic = Object.keys(TOPICS).find((t) => has(q, TOPICS[t]));
      let list = KB.work;
      if (topic) list = KB.work.filter((w) => w.tags.includes(topic) || norm(w.name + ' ' + w.desc + ' ' + w.kind).includes(topic));
      if (!list.length) { topic = null; list = KB.work; }
      const top = list.slice(0, topic ? 4 : 7);
      const blurb = (w) => w.name + ' ' + w.short;
      return {
        args: topic ? { topic } : { limit: 7 },
        hits: top.map((w) => [w.name, w.year]),
        answer: topic
          ? `${cap(top.length)} ${topic === 'mcp' ? 'MCP' : topic === 'rag' ? 'RAG' : topic} project${top.length > 1 ? 's' : ''}. ` + top.slice(0, 3).map(blurb).join(' ')
          : `${cap(KB.work.length)} projects since 2024. The ones people ask about most: ${blurb(KB.work[0])} ${blurb(KB.work[1])} The full list is in the Work section below.`,
      };
    },
    get_project(q, w) {
      return {
        args: { id: w.id },
        hits: [[w.kind, w.year], [w.stack, '']],
        answer: w.desc + (w.award ? ` ${w.award}.` : ''),
      };
    },
    get_experience() {
      const [now, intern] = KB.experience;
      return {
        args: { company: 'Cisco' },
        hits: KB.experience.map((e) => [e.title, e.dates]),
        answer: `${now.title} in Cisco’s Customer Experience team since July 2024, after a six-month internship. He built SVS Pulse, an AI-powered delivery platform covering 500+ projects, on his own initiative. He also works on Verizon’s enterprise network: 20+ automated test suites on IOS-XR and IOS-XE, Splunk set up from scratch across 16 projects, and CX MoP Automation, which cut migration prep from hours to minutes.`,
      };
    },
    list_awards(q) {
      const hack = has(q, ['hackathon', 'hack', 'compet', 'won', 'win']);
      const list = hack ? KB.awards.filter((a) => /hackathon|challenge|verve/i.test(a.award + a.for + a.by)) : KB.awards;
      return {
        args: hack ? { kind: 'competition' } : {},
        hits: list.slice(0, 6).map((a) => [a.award + (a.for ? `, ${a.for}` : ''), a.year]),
        answer: hack
          ? `${cap(list.length)}. First place at the CX Academy AI Hackathon and at the Verve-a-thon Gen AI hackathon (2023), winner of the Cisco WISE India AI Challenge (2025), and first runner-up at the CX Tech4Social Good hackathon (2026) with EcoVisionaries.`
          : `Eleven since 2023, including the Cisco SVS AI Adoption and AI Ideation Awards, first place at the CX Academy AI Hackathon, and first runner-up at CX Tech4Social Good (April 2026). In 2025 alone, five Cisco awards, including Rising Star and Best Team Impact for the Verizon project.`,
      };
    },
    list_certifications() {
      return {
        args: {},
        hits: KB.certs.map((c) => [c.name, c.year]),
        answer: `Five, all earned in February 2026: ${listJoin(KB.certs.map((c) => c.name))}.`,
      };
    },
    list_talks() {
      return {
        args: { since: 2024 },
        hits: KB.talks.slice(0, 5).map((t) => [t.word, t.detail.split(/[,;:]/)[0]]),
        answer: 'Yes, it is a large part of his job. 15+ technical sessions on AI, Splunk and automation, the lab guides for all five CX Lighthouse AI Labs, a five-day AI/ML bootcamp for 50+ new hires and interns, Claude Code and Splunk enablement for his whole team, talks at the WISE India flagship event and the Cisco Security Summit, and the SVS Pulse booth at an internal Cisco showcase.',
      };
    },
    get_education() {
      const e = KB.education;
      return {
        args: {},
        hits: [[e.degree, e.dates], [e.paper, '2024']],
        answer: `${e.degree} from ${e.school} (${e.dates}). His paper, “${e.paper}”, was published at ${e.venue} and won Best Paper Presentation. DOI ${e.doi}.`,
      };
    },
    get_skills() {
      const s = KB.skills;
      return {
        args: {},
        hits: Object.keys(s).map((k) => [k, String(s[k].length)]),
        answer: `Mostly Python and TypeScript. For AI work: ${listJoin(s.AI.slice(0, 4))}, with ${listJoin(s.Frameworks.slice(0, 4))}. On the platform side: ${listJoin(s.Platforms.slice(0, 4))}.`,
      };
    },
    get_contact() {
      const c = KB.contact;
      return {
        args: {},
        hits: [['Email', ''], ['LinkedIn', ''], ['GitHub', '']],
        answer: `Email is quickest: ${c.email}. He is also on LinkedIn (karthikraviii) and GitHub (karthikravi-dev).`,
      };
    },
    search_records(q) {
      const qs = words(q).filter((w) => w.length > 3);
      const pool = [
        ...KB.work.map((w) => ({ label: w.name, right: w.year, text: w.name + ' ' + w.desc + ' ' + w.stack, say: w.desc })),
        ...KB.awards.map((a) => ({ label: a.award, right: a.year, text: a.award + ' ' + a.for + ' ' + a.by, say: `${a.award}${a.for ? ' for ' + a.for : ''}, ${a.by}, ${a.year}.` })),
        ...KB.talks.map((t) => ({ label: t.word, right: '', text: t.word + ' ' + t.detail, say: `${t.word}: ${t.detail}.` })),
        ...KB.experience.flatMap((e) => e.points.map((p) => ({ label: e.title, right: e.dates, text: p, say: p }))),
      ];
      const scored = pool.map((r) => ({ r, s: qs.reduce((n, w) => n + (norm(r.text).includes(w) ? 1 : 0), 0) }))
        .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      if (!scored.length) return {
        args: { query: q.trim().slice(0, 40) },
        hits: [],
        answer: 'Nothing in his records matches that. I can answer questions about his projects, his work at Cisco, awards, certifications, talks, education and how to reach him.',
      };
      return {
        args: { query: q.trim().slice(0, 40) },
        hits: scored.map((x) => [x.r.label, x.r.right]),
        answer: scored.slice(0, 2).map((x) => x.r.say).join(' '),
      };
    },
  };

  function route(raw) {
    const q = norm(raw);
    const plan = [];
    const proj = KB.work.find((w) => [w.name, ...w.aliases].some((a) => q.includes(norm(a).trim())));
    if (proj) plan.push(['get_project', proj]);
    if (has(q, ['hackathon', 'award', 'prize', 'won', 'win ', 'recogni', 'achiev'])) plan.push(['list_awards']);
    if (has(q, ['certif', 'ccnp', 'devnet', 'qualif', 'exam'])) plan.push(['list_certifications']);
    if (has(q, ['talk', 'speak', 'teach', 'train', 'workshop', 'session', 'bootcamp', 'mentor', 'lab'])) plan.push(['list_talks']);
    if (has(q, ['cisco', 'job', 'role', 'experience', 'verizon', 'splunk', 'day to day', 'work at', 'do at', 'currently', 'company'])) plan.push(['get_experience']);
    if (has(q, ['study', 'college', 'degree', 'educat', 'university', 'paper', 'public', 'ieee', 'research'])) plan.push(['get_education']);
    if (has(q, ['skill', 'stack', 'language', 'python', 'typescript', 'tools does', 'framework', 'tech', 'know'])) plan.push(['get_skills']);
    if (has(q, ['contact', 'email', 'mail', 'hire', 'reach', 'linkedin', 'github', 'available'])) plan.push(['get_contact']);
    if (!proj && has(q, ['built', 'build', 'project', 'made', 'make', 'mcp', 'rag', 'agent', 'bot', 'portfolio', 'work on', 'side'])) plan.push(['search_projects']);
    if (!plan.length) plan.push(['search_records']);
    return plan.slice(0, 2);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  async function ask(question) {
    if (busy || !question.trim()) return;
    busy = true;
    log.replaceChildren();
    consoleEl.classList.add('is-busy');
    form.querySelector('button').disabled = true;

    const u = el('div', 'turn turn--user');
    u.append(el('span', 'who', 'You'), el('p', '', escH(question)));
    log.append(u); scrollDown();

    const plan = route(question);
    const answers = [];
    for (const [name, arg] of plan) {
      stateEl.textContent = `Calling ${name}`;
      const res = T[name](norm(question), arg);
      const t = el('div', 'turn turn--tool');
      const call = `<span class="arrow">→</span> ${name}(${escH(JSON.stringify(res.args))})`;
      const codeEl = el('code', '', call); codeEl.translate = false;
      t.append(codeEl);
      const meta = el('span', 'meta', 'running…');
      t.append(meta);
      log.append(t); scrollDown();
      const ms = 24 + Math.round(Math.random() * 60);
      await sleep(380 + ms * 4);
      meta.textContent = res.hits.length ? `${res.hits.length} result${res.hits.length > 1 ? 's' : ''} in ${ms} ms` : `no matches in ${ms} ms`;
      if (res.hits.length) {
        const ul = el('ul', 'hits');
        res.hits.forEach(([a, b]) => { const li = el('li'); li.append(el('span', '', escH(a)), el('span', '', escH(b))); ul.append(li); });
        t.append(ul);
      }
      scrollDown();
      answers.push(res.answer);
      await sleep(200);
    }

    stateEl.textContent = 'Writing';
    const a = el('div', 'turn turn--agent');
    const p = el('p');
    a.append(el('span', 'who', 'Agent'), p);
    log.append(a);
    const text = answers.join(' ');
    if (reduce) { p.textContent = text; }
    else {
      const caret = el('span', 'caret');
      const parts = text.split(/(\s+)/);
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        out += parts[i];
        if (i % 2 === 0) { p.textContent = out; p.append(caret); scrollDown(); await sleep(16 + Math.random() * 22); }
      }
      p.textContent = text;
    }
    scrollDown();
    stateEl.textContent = `Ready, ${KB.tools.length} tools`;
    consoleEl.classList.remove('is-busy');
    form.querySelector('button').disabled = false;
    busy = false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = '';
    ask(q);
  });
  $$('.chip').forEach((c) => c.addEventListener('click', () => ask(c.dataset.q)));

  // No auto question: the console rests on its first exchange until the visitor asks (nothing moves on scroll).
})();
