/** Leave the scene only after both the visual story and destination are ready. */
export function createSceneExitGate(exit: () => void) {
  let ready = false;
  let requested = false;
  let started = false;
  let disposed = false;
  function flush() {
    if (disposed || started || !ready || !requested) return;
    started = true;
    exit();
  }
  return {
    setReady(value: boolean) { ready = value; flush(); },
    requestExit() { requested = true; flush(); },
    dispose() { disposed = true; },
  };
}
