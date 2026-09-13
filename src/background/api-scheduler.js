// Shared across all panels. Only pacing timestamps survive worker restarts.
export function createApiScheduler({ load, save, now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  let tail = Promise.resolve();
  let state;
  return function schedule(kind, request, cancelled = () => false) {
    const task = tail.then(async () => {
      if (!state) {
        const stored = await load();
        if (stored === undefined) state = { globalAt: 0, searchAt: 0 };
        else if ([stored?.globalAt, stored?.searchAt].every((value) => Number.isSafeInteger(value) && value >= 0)) state = stored;
        else throw new Error("速率控制資料無效，已停止請求。");
      }
      while (true) {
        if (cancelled()) throw new Error("查詢已取消。");
        const wait = Math.max(state.globalAt, kind === "search" ? state.searchAt : 0) - now();
        if (wait <= 0) break;
        await sleep(Math.min(wait, 1000));
      }
      // Write ahead conservatively: an interrupted request must not reset the quota.
      const previousSearchAt = state.searchAt;
      const guard = now() + 61000;
      await save({ globalAt: guard, searchAt: Math.max(previousSearchAt, guard) });
      if (cancelled()) throw new Error("查詢已取消。");
      const started = now();
      state = { globalAt: started + 3100, searchAt: kind === "search" ? started + 6100 : previousSearchAt };
      try {
        return await request((retryAfter) => {
          const deadline = now() + retryDelay(retryAfter, now());
          state.globalAt = Math.max(state.globalAt, deadline);
          state.searchAt = Math.max(state.searchAt, deadline);
        });
      } finally {
        try { await save(state); }
        catch (error) { state = undefined; throw error; }
      }
    });
    tail = task.catch(() => {});
    return task;
  };
}

export function retryDelay(value, now) {
  const text = typeof value === "string" ? value.trim() : "";
  const seconds = /^\d+(?:\.\d+)?$/u.test(text) ? Number(text) : NaN;
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(text) - now;
  return Number.isFinite(delay) && delay < Number.MAX_SAFE_INTEGER - now ? Math.max(61000, delay) : 61000;
}

export function createRateStore(storage) {
  const key = "apiPacingV1";
  return {
    load: async () => (await storage.get(key))[key],
    save: async (value) => storage.set({ [key]: { globalAt: value.globalAt, searchAt: value.searchAt } })
  };
}
