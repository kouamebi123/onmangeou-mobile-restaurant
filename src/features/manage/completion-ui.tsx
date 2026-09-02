import { View } from 'react-native';
import type { ReactNode } from 'react';
import { ApiError } from '@/api/envelope';
import { AppText } from '@/components/app-text';
import { tokens } from '@/theme';
import { t } from '@/i18n';
export function CompletionCard({children}:{children:ReactNode}){
 return <View style={{backgroundColor:tokens.color.surface.white,borderRadius:tokens.radius.card,padding:tokens.spacing.md,
 borderWidth:1,borderColor:tokens.color.border.default,gap:tokens.spacing.sm}}>{children}</View>;
}
export function CompletionError({error}:{error:unknown}){
 return error?<AppText selectable color={tokens.color.feedback.error}>{error instanceof ApiError?error.problem.detail:error instanceof Error?error.message:t('errors.generic')}</AppText>:null;
}
