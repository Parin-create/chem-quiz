// Cross-platform "share results" helper.
//
// On mobile (Capacitor) we want the native share sheet; on desktop we copy to
// the clipboard. Right now (web/dev) this uses the Web Share API when available
// and otherwise falls back to clipboard.
//
// NOTE: After we add Capacitor in Step 4, this file gets ONE extra branch that
// imports '@capacitor/share'. It is intentionally left out for now so the app
// builds before that package exists.

export async function shareResults(text) {
  // 1. Capacitor native share (only present once the app runs inside Capacitor).
  try {
    if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
      const pkg = "@capacitor/share"; // indirection keeps Vite from resolving it at build time
      const { Share } = await import(/* @vite-ignore */ pkg);
      await Share.share({ title: "My Chemistry Quiz Result", text });
      return "shared";
    }
  } catch {
    // fall through to web options
  }

  // 2. Web Share API (some desktop browsers + most phones in the browser).
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "My Chemistry Quiz Result", text });
      return "shared";
    }
  } catch {
    // user cancelled or unsupported — fall through
  }

  // 3. Clipboard fallback (desktop).
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
