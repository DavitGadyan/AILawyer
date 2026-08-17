import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/api/client';
import { streamChat } from '@/api/chatStream';
import type { Jurisdiction, Lawyer, Practice } from '@/api/types';
import { ActionSheet } from '@/components/ActionSheet';
import { AppHeader } from '@/components/AppHeader';
import { DisclaimerChip, EmptyState, ErrorNote } from '@/components/Bits';
import { ChatBubble } from '@/components/ChatBubble';
import { Composer } from '@/components/Composer';
import { LawyerCard } from '@/components/LawyerCard';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { colors, radius, spacing, type } from '@/theme/tokens';

interface Turn {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  lawyers?: Lawyer[];
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    q?: string;
    practice?: string;
    jurisdiction?: string;
  }>();
  const {
    user,
    locale,
    practice: appPractice,
    jurisdiction: appJurisdiction,
    aiEnabled,
  } = useApp();
  const queryClient = useQueryClient();

  const initialSessionId = params.id === 'new' ? null : Number(params.id);

  // For an existing session the server's stored practice wins; for a new one the
  // route param (set by Home) does.
  const [practice, setPractice] = useState<Practice>(
    (params.practice as Practice) ?? appPractice,
  );
  const isTax = practice === 'tax';
  const jurisdiction = (params.jurisdiction as Jurisdiction) ?? appJurisdiction;

  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState<number | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sentInitial = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || streaming) return;

      setError('');
      setDraft('');
      setStreaming(true);

      const stamp = String(Date.now());
      setTurns((prev) => [
        ...prev,
        { key: `u-${stamp}`, role: 'user', content: message },
        { key: `a-${stamp}`, role: 'assistant', content: '' },
      ]);
      scrollToEnd();

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        { message, sessionId, practice, jurisdiction, locale },
        {
          onSession: (id) => setSessionId(id),
          onDelta: (text) => {
            setTurns((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + text };
              }
              return next;
            });
            scrollToEnd();
          },
          onLawyers: (lawyers) => {
            setTurns((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, lawyers };
              }
              return next;
            });
            scrollToEnd();
          },
          onError: (message) => {
            setError(
              message === 'network'
                ? t('common.error')
                : message,
            );
            // Drop the empty assistant placeholder so the thread isn't left dangling.
            setTurns((prev) =>
              prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev,
            );
          },
        },
        controller.signal,
      );

      setStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      scrollToEnd();
    },
    [streaming, sessionId, practice, jurisdiction, locale, scrollToEnd, queryClient, t],
  );

  // Load an existing conversation.
  useEffect(() => {
    if (initialSessionId === null || Number.isNaN(initialSessionId)) return;
    (async () => {
      try {
        const detail = await api.session(initialSessionId);
        setPractice(detail.practice);
        const restored: Turn[] = [];
        for (const m of detail.messages) {
          const turn: Turn = {
            key: `m-${m.id}`,
            role: m.role,
            content: m.content,
          };
          if (m.lawyer_ids?.length) {
            const found = await Promise.all(
              m.lawyer_ids.map((id) => api.lawyer(id).catch(() => null)),
            );
            turn.lawyers = found.filter(Boolean) as Lawyer[];
          }
          restored.push(turn);
        }
        setTurns(restored);
        if (detail.has_profile) {
          const profile = await (detail.practice === 'tax'
            ? api.taxProfileBySession(initialSessionId)
            : api.caseProfileBySession(initialSessionId)
          ).catch(() => null);
          if (profile) setProfileId(profile.id);
        }
        scrollToEnd();
      } catch {
        setError(t('common.error'));
      }
    })();
  }, [initialSessionId, scrollToEnd, t]);

  // Fire the question that was typed on the home screen.
  useEffect(() => {
    if (sentInitial.current || !params.q) return;
    sentInitial.current = true;
    send(String(params.q));
  }, [params.q, send]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const analysisPath = (id: number) => (isTax ? `/structure/${id}` : `/case/${id}`);

  const runTriage = async () => {
    const description = turns
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content)
      .join('\n\n');
    if (description.length < 10) return;

    setTriaging(true);
    setError('');
    try {
      const payload = {
        description,
        jurisdiction,
        locale,
        session_id: sessionId ?? undefined,
      };
      const profile = isTax
        ? await api.analyseTax(payload)
        : await api.triage(payload);
      setProfileId(profile.id);
      router.push(analysisPath(profile.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setTriaging(false);
    }
  };

  const hasUserTurn = turns.some((turn) => turn.role === 'user');

  return (
    <Screen edges={['top']}>
      <AppHeader
        title={t(isTax ? 'tax.chatTitle' : 'chat.title')}
        rightIcon={profileId ? 'document-text-outline' : undefined}
        onRightPress={profileId ? () => router.push(analysisPath(profileId)) : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {!aiEnabled ? (
            <ErrorNote
              message={t(isTax ? 'tax.unavailable' : 'chat.aiUnavailable')}
              style={styles.notice}
            />
          ) : null}

          {turns.length === 0 && aiEnabled ? (
            <EmptyState
              icon="sparkles-outline"
              title={t(isTax ? 'tax.emptyTitle' : 'chat.emptyTitle')}
              body={t(isTax ? 'tax.emptyBody' : 'chat.emptyBody')}
            />
          ) : null}

          {turns.map((turn, index) => (
            <View key={turn.key}>
              <ChatBubble
                role={turn.role}
                content={turn.content}
                authorName={user?.full_name}
                pending={
                  turn.role === 'assistant' &&
                  turn.content === '' &&
                  streaming &&
                  index === turns.length - 1
                }
              />

              {turn.lawyers?.length ? (
                <View style={styles.carouselBlock}>
                  <Text style={styles.carouselTitle}>
                    {t(isTax ? 'tax.matchedAdvisers' : 'chat.matchedLawyers')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carousel}
                    style={styles.carouselStrip}
                  >
                    {turn.lawyers.map((lawyer) => (
                      <LawyerCard
                        key={lawyer.id}
                        lawyer={lawyer}
                        variant="carousel"
                        onPress={() => router.push(`/lawyer/${lawyer.id}`)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ))}

          {error ? <ErrorNote message={error} style={styles.notice} /> : null}

          {hasUserTurn && !streaming ? (
            <Pressable
              onPress={profileId ? () => router.push(analysisPath(profileId)) : runTriage}
              disabled={triaging}
              style={({ pressed }) => [styles.analyse, pressed && styles.pressed]}
            >
              <Ionicons
                name={
                  profileId
                    ? 'document-text-outline'
                    : isTax
                      ? 'git-network-outline'
                      : 'analytics-outline'
                }
                size={16}
                color={colors.taupe}
              />
              <Text style={styles.analyseLabel}>
                {triaging
                  ? t(isTax ? 'tax.analysing' : 'chat.analysing')
                  : profileId
                    ? t(isTax ? 'tax.viewAnalysis' : 'chat.viewCase')
                    : t(isTax ? 'tax.analyse' : 'chat.analyseCase')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.composerWrap}>
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={() => send(draft)}
            placeholder={t(isTax ? 'tax.chatPlaceholder' : 'chat.placeholder')}
            speakLabel={t('home.speak')}
            locale={locale}
            busy={streaming}
            disabled={!aiEnabled}
            onPlus={() => setActionsOpen(true)}
          />
          <DisclaimerChip
            label={t(isTax ? 'tax.disclaimerChip' : 'disclaimer.chip')}
          />
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={actionsOpen}
        title={t('quick.title')}
        cancelLabel={t('common.cancel')}
        onClose={() => setActionsOpen(false)}
        actions={[
          {
            key: 'analyse',
            icon: isTax ? 'git-network-outline' : 'analytics-outline',
            label: profileId
              ? t(isTax ? 'tax.viewAnalysis' : 'chat.viewCase')
              : t(isTax ? 'tax.analyse' : 'quick.analyse'),
            description: t('quick.analyseDesc'),
            onPress: () =>
              profileId ? router.push(analysisPath(profileId)) : runTriage(),
          },
          {
            key: 'lawyer',
            icon: 'people-outline',
            label: isTax ? t('quick.findAdviser') : t('quick.findLawyer'),
            description: isTax ? t('quick.findAdviserDesc') : t('quick.findLawyerDesc'),
            onPress: () => router.push('/(tabs)/lawyers'),
          },
          {
            key: 'new',
            icon: 'add-circle-outline',
            label: t('quick.newChat'),
            description: t('quick.newChatDesc'),
            onPress: () => router.replace('/chat/new'),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  notice: {
    marginBottom: spacing.lg,
  },
  carouselBlock: {
    marginBottom: spacing.xl,
    marginTop: -spacing.xs,
  },
  carouselTitle: {
    ...type.label,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  carouselStrip: {
    // Tall enough for the lawyer card; keeps the strip from collapsing on web.
    height: 236,
    flexGrow: 0,
    flexShrink: 0,
  },
  carousel: {
    paddingRight: spacing.xl,
    paddingVertical: 2,
  },
  analyse: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  analyseLabel: {
    ...type.captionStrong,
    fontSize: 13,
    color: colors.taupe,
  },
  pressed: {
    opacity: 0.8,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
