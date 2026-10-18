// Keep Firebase sign-in across reloads in this tab, without remembering it indefinitely.
export function createSessionAuth(app, sdk) {
  return sdk.initializeAuth(app, {
    persistence: sdk.browserSessionPersistence,
    popupRedirectResolver: sdk.browserPopupRedirectResolver,
  });
}
