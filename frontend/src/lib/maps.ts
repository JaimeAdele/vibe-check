let mapsScriptLoaded = false;
let mapsScriptPromise: Promise<void> | null = null;

export function loadMapsScript(): Promise<void> {
  if (mapsScriptLoaded) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const callbackName = '__mapsReady_' + Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[callbackName] = () => {
      mapsScriptLoaded = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[callbackName];
      resolve();
    };
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}` +
      `&v=beta&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}
