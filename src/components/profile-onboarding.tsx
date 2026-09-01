import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Modal } from 'react-native';
import { fetchMe } from '@/api/auth';
import { apiRequest } from '@/api/client';
import type { MeProfile } from '@/api/types';
import { useAuthStore } from '@/store/auth-store';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ErrorState } from '@/components/error-state';
import { t } from '@/i18n';

/** Resumes an interrupted first-login profile step on the next app opening. */
export function ProfileOnboarding({ children }: { children: ReactNode }) {
  const sessionId = useAuthStore((state) => state.sessionId);
  const clear = useAuthStore((state) => state.clear);
  const client = useQueryClient();
  const [name, setName] = useState('');
  const key = ['onboarding-profile', sessionId];
  const profile = useQuery({ queryKey: key, queryFn: fetchMe, enabled: Boolean(sessionId) });
  const save = useMutation({
    mutationFn: async () => (await apiRequest<MeProfile>('/me', {
      method: 'PATCH', body: { fullName: name.trim() },
    })).data,
    onSuccess: (data) => {
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['me'] });
      setName('');
    },
  });
  if (!sessionId) return children;
  if (profile.data?.fullName?.trim()) return children;
  return (
    <>
    {children}
    <Modal visible animationType="slide" onRequestClose={() => undefined}>
    <Screen>
      {profile.isPending ? <ActivityIndicator /> : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <AppText variant="title">{t('onboarding.title')}</AppText>
          <AppText>{t('onboarding.detail')}</AppText>
          <TextField label={t('onboarding.name')} value={name} onChangeText={setName}
            maxLength={160} autoCapitalize="words" autoComplete="name" />
          {save.isError ? <AppText>{t('errors.generic')}</AppText> : null}
          <Button label={t('onboarding.save')} loading={save.isPending}
            disabled={name.trim().length < 2} onPress={() => save.mutate()} />
        </>
      )}
      <Button label={t('onboarding.signOut')} variant="ghost" onPress={() => {
        void clear().then(() => client.clear());
      }} />
    </Screen>
    </Modal>
    </>
  );
}
