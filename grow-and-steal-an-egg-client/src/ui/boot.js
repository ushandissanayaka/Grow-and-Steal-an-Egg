// The loading page drawn by index.html itself (shown from the first moment, before the game code has
// downloaded). The game's own loading page (LoadingScreen.jsx) looks the same and removes it once it
// is on screen, so the switch can't be seen.

export function removeBootScreen() {
  document.getElementById('boot')?.remove();
}
