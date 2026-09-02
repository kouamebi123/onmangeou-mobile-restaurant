import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback for quick actions (availability toggle, chip selection). */
export function hapticLight(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Success feedback for completed operations (order accepted, dish saved). */
export function hapticSuccess(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Warning feedback for destructive confirmations (order rejected). */
export function hapticWarning(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
