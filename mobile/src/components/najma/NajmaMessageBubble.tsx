import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export function NajmaMessageBubble({ role, content }: Props) {
  const isUser = role === 'user'
  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={isUser ? styles.userText : styles.assistantText}>{content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.sm,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
  },
  userBubble: {
    backgroundColor: tokens.colors.primary,
    borderBottomRightRadius: tokens.radius.sm,
  },
  assistantBubble: {
    backgroundColor: tokens.colors.surface,
    borderBottomLeftRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  userText: {
    color: tokens.colors.white,
    fontSize: tokens.fontSize.base,
    lineHeight: 20,
  },
  assistantText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.base,
    lineHeight: 20,
  },
})
