/** Saves `text` as-is under `filename`, so what's downloaded is byte for byte what was given. */
export function downloadJson(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url));
}
