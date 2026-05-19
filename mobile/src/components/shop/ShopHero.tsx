import React from 'react'
import { View, Image, Pressable, Text, StyleSheet, Platform } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  coverUrl: string
  onBack: () => void
  onShare?: () => void
  onFavorite?: () => void
}

const TOP_OFFSET = Platform.OS === 'ios' ? 52 : 16

export function ShopHero({ coverUrl, onBack, onShare, onFavorite }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: coverUrl }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Gradient overlay at bottom for text contrast */}
      <View style={styles.gradient} />

      {/* Back button — top-left */}
      <Pressable
        onPress={onBack}
        style={[styles.iconBtn, { top: TOP_OFFSET, left: tokens.spacing.lg }]}
        hitSlop={8}
        accessibilityLabel="Go back"
      >
        <View style={styles.iconBg}>
          <Text style={styles.iconText}>‹</Text>
        </View>
      </Pressable>

      {/* Right action buttons */}
      <View style={[styles.rightActions, { top: TOP_OFFSET }]}>
        {onFavorite && (
          <Pressable
            onPress={onFavorite}
            hitSlop={8}
            accessibilityLabel="Favorite"
          >
            <View style={styles.iconBg}>
              <Text style={styles.iconSmall}>♡</Text>
            </View>
          </Pressable>
        )}
        {onShare && (
          <Pressable
            onPress={onShare}
            hitSlop={8}
            accessibilityLabel="Share"
          >
            <View style={styles.iconBg}>
              <Text style={styles.iconSmall}>⤴</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    width: '100%',
    backgroundColor: tokens.colors.surfaceAlt,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconBtn: {
    position: 'absolute',
    zIndex: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  iconText: {
    fontSize: 26,
    lineHeight: 32,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.bold,
    marginTop: -2,
  },
  iconSmall: {
    fontSize: 18,
    color: tokens.colors.text,
  },
  rightActions: {
    position: 'absolute',
    right: tokens.spacing.lg,
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    zIndex: 10,
  },
})
