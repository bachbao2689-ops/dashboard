declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;

interface Window {
  triggerAppUpdate?: (info?: { version?: string; title?: string; message?: string }) => void;
  checkForAppUpdate?: () => Promise<boolean>;
}
