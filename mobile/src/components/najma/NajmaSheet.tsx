import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useNajmaStore, type NajmaChatEntry } from '@/src/store/najmaStore'
import { PreviewPill } from '@/src/components/PreviewPill'
import { chatWithNajma } from '@/src/lib/najma/openai'
import { buildSystemPrompt } from '@/src/lib/najma/system-prompt'
import { NajmaMessageBubble } from './NajmaMessageBubble'
import { NajmaPresetChips } from './NajmaPresetChips'

interface Props {
  visible: boolean
  onClose: () => void
}

export function NajmaSheet({ visible, onClose }: Props) {
  const router = useRouter()
  const locale = useLanguageStore((s) => s.locale)
  const chatMessages = useNajmaStore((s) => s.chatMessages)
  const chatStatus = useNajmaStore((s) => s.chatStatus)
  const chatError = useNajmaStore((s) => s.chatError)
  const addUserMessage = useNajmaStore((s) => s.addUserMessage)
  const addAssistantMessage = useNajmaStore((s) => s.addAssistantMessage)
  const clearChat = useNajmaStore((s) => s.clearChat)
  const setStatus = useNajmaStore((s) => s.setStatus)
  const setError = useNajmaStore((s) => s.setError)

  const [text, setText] = useState('')
  const listRef = useRef<FlatList<NajmaChatEntry>>(null)
  const inputRef = useRef<TextInput>(null)

  const hasChat = chatMessages.length > 0
  const isLaunchingSoon = chatError === 'no-key'

  // Auto-scroll to newest message
  useEffect(() => {
    if (chatMessages.length > 0) {
      const id = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true })
      }, 50)
      return () => clearTimeout(id)
    }
  }, [chatMessages.length, chatStatus])

  const send = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed || chatStatus === 'thinking') return
      Haptics.selectionAsync().catch(() => {})

      addUserMessage(trimmed)
      setText('')
      setError(null)
      setStatus('thinking')

      const priorMessages = useNajmaStore.getState().chatMessages
      const payload = [
        { role: 'system' as const, content: buildSystemPrompt(locale) },
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
      ]

      const result = await chatWithNajma(payload)
      if (result.ok && result.reply) {
        addAssistantMessage(result.reply)
        setStatus('idle')
        setError(null)
      } else {
        setStatus('error')
        setError(result.error ?? 'unknown')
      }
    },
    [chatStatus, addUserMessage, addAssistantMessage, setStatus, setError, locale],
  )

  const handleSend = () => send(text)

  const handlePresetPick = (presetText: string) => {
    // Fill the input; user reviews + edits + sends.
    setText(presetText)
    Haptics.selectionAsync().catch(() => {})
    inputRef.current?.focus()
  }

  const handleRetry = useCallback(() => {
    // Find the most recent user message and replay it.
    const last = [...chatMessages].reverse().find((m) => m.role === 'user')
    if (!last) {
      setStatus('idle')
      setError(null)
      return
    }
    setError(null)
    setStatus('thinking')
    ;(async () => {
      const priorMessages = useNajmaStore.getState().chatMessages
      const payload = [
        { role: 'system' as const, content: buildSystemPrompt(locale) },
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
      ]
      const result = await chatWithNajma(payload)
      if (result.ok && result.reply) {
        addAssistantMessage(result.reply)
        setStatus('idle')
        setError(null)
      } else {
        setStatus('error')
        setError(result.error ?? 'unknown')
      }
    })()
  }, [chatMessages, addAssistantMessage, setStatus, setError, locale])

  const handleClear = () => {
    clearChat()
    setText('')
  }

  const sendDisabled = !text.trim() || chatStatus === 'thinking' || isLaunchingSoon

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.brandRow}>
                <Ionicons name="star" size={20} color={tokens.colors.accent} />
                <Text style={styles.brand}>{t('najma.title')}</Text>
              </View>
              <View style={styles.previewWrap}>
                <PreviewPill size="sm" />
              </View>
            </View>
            <View style={styles.headerRight}>
              {hasChat && (
                <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>{t('najma.clear')}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  onClose()
                  router.push('/najma/camera' as never)
                }}
                hitSlop={8}
                accessibilityLabel={t('najma.vision.title')}
              >
                <Ionicons name="camera" size={22} color={tokens.colors.text} />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={tokens.colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          {hasChat ? (
            <FlatList
              ref={listRef}
              data={chatMessages}
              keyExtractor={(_, i) => `m-${i}`}
              renderItem={({ item }) => (
                <NajmaMessageBubble role={item.role} content={item.content} />
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={
                chatStatus === 'thinking' ? (
                  <View style={styles.thinkingRow}>
                    <View style={styles.thinkingBubble}>
                      <ActivityIndicator size="small" color={tokens.colors.primary} />
                      <Text style={styles.thinkingText}>{t('najma.thinking')}</Text>
                    </View>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.empty}>
              <View style={styles.avatar}>
                <Ionicons name="star" size={26} color={tokens.colors.white} />
              </View>
              <Text style={styles.tagline}>{t('najma.tagline')}</Text>
              <View style={styles.presetsWrap}>
                <NajmaPresetChips onPick={handlePresetPick} />
              </View>
            </View>
          )}

          {/* Input / launching-soon card */}
          {isLaunchingSoon ? (
            <View style={styles.launchingCard}>
              <Ionicons name="sparkles" size={22} color={tokens.colors.primary} />
              <Text style={styles.launchingTitle}>{t('najma.error.launching')}</Text>
              <Text style={styles.launchingSub}>{t('najma.error.launchingSub')}</Text>
            </View>
          ) : (
            <View>
              {chatStatus === 'error' && chatError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{t('najma.error.generic')}</Text>
                  <Pressable onPress={handleRetry} style={styles.retryBtn} hitSlop={6}>
                    <Text style={styles.retryBtnText}>{t('najma.error.retry')}</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('najma.placeholder')}
                  placeholderTextColor={tokens.colors.textMuted}
                  style={styles.input}
                  multiline
                  maxLength={500}
                  editable={chatStatus !== 'thinking'}
                />
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    sendDisabled && styles.sendBtnDisabled,
                    pressed && !sendDisabled && styles.sendBtnPressed,
                  ]}
                  disabled={sendDisabled}
                  accessibilityLabel={t('najma.send.label')}
                >
                  <Ionicons name="arrow-up" size={20} color={tokens.colors.white} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kbWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginBottom: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brand: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  previewWrap: {
    marginTop: tokens.spacing.xs,
  },
  clearBtn: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  clearBtnText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.semibold,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  presetsWrap: {
    width: '100%',
    marginTop: tokens.spacing.sm,
  },

  // Chat list
  list: {
    maxHeight: 380,
    marginBottom: tokens.spacing.sm,
  },
  listContent: {
    paddingVertical: tokens.spacing.sm,
  },
  thinkingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderBottomLeftRadius: tokens.radius.sm,
  },
  thinkingText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },

  // Launching-soon card
  launchingCard: {
    marginTop: tokens.spacing.md,
    backgroundColor: tokens.colors.accentSoft,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  launchingTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  launchingSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSubtle,
    textAlign: 'center',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surfaceAlt,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
  },
  retryBtn: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  retryBtnText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.bold,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.surface,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: {
    backgroundColor: tokens.colors.primaryDark,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})
