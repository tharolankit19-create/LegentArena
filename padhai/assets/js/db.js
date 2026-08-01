/* Supabase data layer + in-memory cache.
   Every query is scoped to the signed-in student by Row Level Security. */
(function () {
  const C = window.CONFIG.supabase;
  const client = window.supabase.createClient(C.url, C.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  const T = {
    profiles:  'padhai_profiles',
    progress:  'padhai_progress',
    logs:      'padhai_logs',
    resources: 'padhai_resources',
    questions: 'padhai_questions',
    sessions:  'padhai_sessions',
    attempts:  'padhai_attempts'
  };

  // cache, refreshed by DB.load()
  const cache = {
    user: null,
    profile: null,
    progress: {},   // chapterId -> row
    logs: [],       // last 120 days
    resources: [],
    loaded: false
  };

  function fail(error, what) {
    if (!error) return;
    console.error('[db]', what, error);
    const msg = error.message || String(error);
    throw new Error(msg);
  }

  /* ---------------- auth ---------------- */

  async function signUp(email, password, name) {
    const { data, error } = await client.auth.signUp({
      email: email, password: password, options: { data: { name: name } }
    });
    fail(error, 'signUp');
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: email, password: password });
    fail(error, 'signIn');
    return data;
  }

  async function signOut() {
    await client.auth.signOut();
    cache.user = null; cache.profile = null; cache.progress = {};
    cache.logs = []; cache.resources = []; cache.loaded = false;
  }

  async function currentUser() {
    const { data } = await client.auth.getSession();
    cache.user = data && data.session ? data.session.user : null;
    return cache.user;
  }

  function onAuthChange(cb) {
    client.auth.onAuthStateChange(function (_evt, session) { cb(session ? session.user : null); });
  }

  /* ---------------- profile ---------------- */

  async function loadProfile() {
    if (!cache.user) return null;
    const { data, error } = await client.from(T.profiles).select('*').eq('id', cache.user.id).maybeSingle();
    if (error) fail(error, 'loadProfile');
    if (!data) {
      // trigger normally creates this; insert as a fallback
      const row = {
        id: cache.user.id,
        name: (cache.user.user_metadata && cache.user.user_metadata.name) || cache.user.email.split('@')[0],
        target_exam: window.CONFIG.study.defaultExam,
        exam_date: window.CONFIG.study.defaultExamDate,
        daily_goal_min: window.CONFIG.study.defaultDailyGoalMin
      };
      const ins = await client.from(T.profiles).insert(row).select().single();
      if (ins.error) fail(ins.error, 'createProfile');
      cache.profile = ins.data;
    } else {
      cache.profile = data;
    }
    return cache.profile;
  }

  async function updateProfile(patch) {
    const { data, error } = await client.from(T.profiles)
      .update(patch).eq('id', cache.user.id).select().single();
    fail(error, 'updateProfile');
    cache.profile = data;
    return data;
  }

  /* ---------------- progress ---------------- */

  function blankProgress(chapterId) {
    return {
      user_id: cache.user ? cache.user.id : null,
      chapter_id: chapterId,
      lecture_done: false, dpp_done: false, module_done: false,
      pyq_count: 0, test_score: null, confidence: 0,
      revision_count: 0, last_studied: null, notes: null
    };
  }

  function progressOf(chapterId) {
    return cache.progress[chapterId] || blankProgress(chapterId);
  }

  async function saveProgress(chapterId, patch) {
    const base = progressOf(chapterId);
    const row = Object.assign({}, base, patch, {
      user_id: cache.user.id, chapter_id: chapterId, last_studied: UI.today()
    });
    delete row.updated_at;
    const { data, error } = await client.from(T.progress)
      .upsert(row, { onConflict: 'user_id,chapter_id' }).select().single();
    fail(error, 'saveProgress');
    cache.progress[chapterId] = data;
    return data;
  }

  /* ---------------- study logs ---------------- */

  async function addLog(entry) {
    const row = Object.assign({ user_id: cache.user.id, log_date: UI.today() }, entry);
    const { data, error } = await client.from(T.logs).insert(row).select().single();
    fail(error, 'addLog');
    cache.logs.unshift(data);
    return data;
  }

  async function deleteLog(id) {
    const { error } = await client.from(T.logs).delete().eq('id', id);
    fail(error, 'deleteLog');
    cache.logs = cache.logs.filter(function (l) { return l.id !== id; });
  }

  /* ---------------- resources ---------------- */

  async function listResources() {
    const { data, error } = await client.from(T.resources)
      .select('*').order('created_at', { ascending: false });
    fail(error, 'listResources');
    cache.resources = data || [];
    return cache.resources;
  }

  async function uploadResource(file, meta) {
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = cache.user.id + '/' + Date.now() + '_' + safe;
    const up = await client.storage.from(C.bucket).upload(path, file, { upsert: false });
    if (up.error) fail(up.error, 'uploadResource');
    const row = Object.assign({
      user_id: cache.user.id,
      file_path: path, file_size: file.size, mime_type: file.type || null
    }, meta);
    const { data, error } = await client.from(T.resources).insert(row).select().single();
    if (error) {
      await client.storage.from(C.bucket).remove([path]);   // don't leave an orphan file
      fail(error, 'insertResource');
    }
    cache.resources.unshift(data);
    return data;
  }

  async function resourceUrl(path) {
    const { data, error } = await client.storage.from(C.bucket).createSignedUrl(path, 3600);
    fail(error, 'resourceUrl');
    return data.signedUrl;
  }

  async function deleteResource(row) {
    if (row.file_path) await client.storage.from(C.bucket).remove([row.file_path]);
    const { error } = await client.from(T.resources).delete().eq('id', row.id);
    fail(error, 'deleteResource');
    cache.resources = cache.resources.filter(function (r) { return r.id !== row.id; });
  }

  /* ---------------- questions ---------------- */

  async function findQuestions(filter) {
    let q = client.from(T.questions).select('*');
    if (filter.chapterIds && filter.chapterIds.length) q = q.in('chapter_id', filter.chapterIds);
    if (filter.topicIds && filter.topicIds.length)     q = q.in('topic_id', filter.topicIds);
    if (filter.subjectId)                              q = q.eq('subject_id', filter.subjectId);
    if (filter.year)                                   q = q.eq('year', Number(filter.year));
    if (filter.onlyPyq)                                q = q.not('year', 'is', null);
    if (filter.difficulty && filter.difficulty !== 'mixed' && filter.difficulty !== 'progressive') {
      q = q.eq('difficulty', filter.difficulty);
    }
    const { data, error } = await q.limit(filter.limit || 400);
    fail(error, 'findQuestions');
    return data || [];
  }

  async function countQuestions(filter) {
    let q = client.from(T.questions).select('id', { count: 'exact', head: true });
    if (filter.chapterIds && filter.chapterIds.length) q = q.in('chapter_id', filter.chapterIds);
    if (filter.year) q = q.eq('year', Number(filter.year));
    const { count, error } = await q;
    fail(error, 'countQuestions');
    return count || 0;
  }

  async function availableYears() {
    const { data, error } = await client.from(T.questions)
      .select('year').not('year', 'is', null).limit(5000);
    fail(error, 'availableYears');
    const set = {};
    (data || []).forEach(function (r) { set[r.year] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
  }

  async function insertQuestions(rows) {
    const withOwner = rows.map(function (r) { return Object.assign({}, r, { owner_id: cache.user.id }); });
    const { data, error } = await client.from(T.questions).insert(withOwner).select('id');
    fail(error, 'insertQuestions');
    return data || [];
  }

  async function myQuestionStats() {
    const { data, error } = await client.from(T.questions)
      .select('chapter_id, year, difficulty').limit(5000);
    fail(error, 'myQuestionStats');
    return data || [];
  }

  /* ---------------- practice ---------------- */

  async function startSession(config) {
    const { data, error } = await client.from(T.sessions)
      .insert({ user_id: cache.user.id, config: config }).select().single();
    fail(error, 'startSession');
    return data;
  }

  async function saveAttempts(rows) {
    if (!rows.length) return;
    const { error } = await client.from(T.attempts)
      .insert(rows.map(function (r) { return Object.assign({ user_id: cache.user.id }, r); }));
    fail(error, 'saveAttempts');
  }

  async function finishSession(id, totals) {
    const { data, error } = await client.from(T.sessions)
      .update(Object.assign({ finished_at: new Date().toISOString() }, totals))
      .eq('id', id).select().single();
    fail(error, 'finishSession');
    return data;
  }

  async function sessionHistory(limit) {
    const { data, error } = await client.from(T.sessions)
      .select('*').not('finished_at', 'is', null)
      .order('started_at', { ascending: false }).limit(limit || 30);
    fail(error, 'sessionHistory');
    return data || [];
  }

  async function attemptStats() {
    const { data, error } = await client.from(T.attempts)
      .select('chapter_id, is_correct, seconds, created_at')
      .order('created_at', { ascending: false }).limit(3000);
    fail(error, 'attemptStats');
    return data || [];
  }

  /* ---------------- bulk load ---------------- */

  async function load() {
    if (!cache.user) return;
    await loadProfile();
    const since = UI.addDays(UI.today(), -120);
    const [prog, logs, res] = await Promise.all([
      client.from(T.progress).select('*'),
      client.from(T.logs).select('*').gte('log_date', since).order('log_date', { ascending: false }),
      client.from(T.resources).select('*').order('created_at', { ascending: false })
    ]);
    fail(prog.error, 'load.progress');
    fail(logs.error, 'load.logs');
    fail(res.error, 'load.resources');

    cache.progress = {};
    (prog.data || []).forEach(function (r) { cache.progress[r.chapter_id] = r; });
    cache.logs = logs.data || [];
    cache.resources = res.data || [];
    cache.loaded = true;
  }

  window.DB = {
    client: client, cache: cache, tables: T,
    signUp: signUp, signIn: signIn, signOut: signOut, currentUser: currentUser, onAuthChange: onAuthChange,
    loadProfile: loadProfile, updateProfile: updateProfile,
    progressOf: progressOf, blankProgress: blankProgress, saveProgress: saveProgress,
    addLog: addLog, deleteLog: deleteLog,
    listResources: listResources, uploadResource: uploadResource, resourceUrl: resourceUrl, deleteResource: deleteResource,
    findQuestions: findQuestions, countQuestions: countQuestions, availableYears: availableYears,
    insertQuestions: insertQuestions, myQuestionStats: myQuestionStats,
    startSession: startSession, saveAttempts: saveAttempts, finishSession: finishSession,
    sessionHistory: sessionHistory, attemptStats: attemptStats,
    load: load
  };
})();
