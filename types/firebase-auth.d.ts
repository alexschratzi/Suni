// Shim for fixing the import error of getReactNativePersistence in the firebase.ts file

// Ensure we augment the existing module, not replace it
import "firebase/auth";

declare module "firebase/auth" {
  // Minimal AsyncStorage shape
  interface ReactNativeAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  // Add the missing export with the correct return type
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
