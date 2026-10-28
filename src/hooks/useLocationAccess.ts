/**
 * Current foreground location access, refreshed when the app returns to the
 * foreground (e.g. after the user changes it in system Settings).
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getForegroundLocationAccess,
  requestForegroundLocationAccess,
  type LocationAccess,
} from '../pace/locationPermission';

export function useLocationAccess(): {
  access: LocationAccess | null;
  request: () => Promise<LocationAccess>;
} {
  const [access, setAccess] = useState<LocationAccess | null>(null);

  useEffect(() => {
    const refresh = () => {
      getForegroundLocationAccess().then(setAccess).catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  const request = useCallback(async () => {
    const next = await requestForegroundLocationAccess();
    setAccess(next);
    return next;
  }, []);

  return { access, request };
}
