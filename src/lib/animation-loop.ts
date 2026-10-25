type FrameScheduler = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};

/** A stopped or unavailable drawing surface must never enqueue another frame. */
export function startAnimationLoop(
  draw: (time: number) => void | false,
  scheduler: FrameScheduler = {
    request: callback => requestAnimationFrame(callback),
    cancel: id => cancelAnimationFrame(id),
  },
) {
  let stopped = false;
  let frame: number | null = null;
  function tick(time: number) {
    frame = null;
    if (stopped) return;
    if (draw(time) === false) stopped = true;
    if (!stopped) frame = scheduler.request(tick);
  }
  frame = scheduler.request(tick);
  return () => {
    stopped = true;
    if (frame !== null) scheduler.cancel(frame);
    frame = null;
  };
}
