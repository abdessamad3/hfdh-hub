// Session-only by default. A teacher must explicitly trust this device for offline reopening.
export function createSessionAuth(app, sdk) {
  let trusted=false;try{trusted=globalThis.localStorage?.getItem('katatib-offline-trusted')==='yes';}catch{}
  return sdk.initializeAuth(app, {
    persistence: trusted&&sdk.browserLocalPersistence?[sdk.browserLocalPersistence,sdk.browserSessionPersistence]:sdk.browserSessionPersistence,
    popupRedirectResolver: sdk.browserPopupRedirectResolver,
  });
}
