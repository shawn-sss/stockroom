type RunGuardedActionArgs = {
  setBusy: (next: boolean) => void;
  setError: (message: string) => void;
  action: () => Promise<void>;
};

export async function runGuardedAction({
  setBusy,
  setError,
  action,
}: RunGuardedActionArgs) {
  setBusy(true);
  setError("");
  try {
    await action();
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Unexpected error";
    setError(message);
  } finally {
    setBusy(false);
  }
}
