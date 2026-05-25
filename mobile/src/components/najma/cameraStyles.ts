import { StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

// Styles for app/najma/camera.tsx — extracted to keep the route file lean.
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  screenDark: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullCenter: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bg,
  },
  headerDark: {
    backgroundColor: '#000',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  headerTitleDark: {
    color: tokens.colors.white,
  },
  modeList: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  modeTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBody: {
    flex: 1,
    gap: 2,
  },
  modeTitle: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  modeSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
  },
  cameraTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTopTitle: {
    color: tokens.colors.white,
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
  },
  cameraBottom: {
    alignItems: 'center',
    paddingBottom: tokens.spacing.xl,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4,
    borderColor: tokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.white,
  },
  shutterPressed: {
    opacity: 0.7,
  },
  previewWrap: {
    flex: 1,
    margin: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  btnGhost: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  btnGhostText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  btnPrimary: {
    backgroundColor: tokens.colors.primary,
  },
  btnPrimaryText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  btnPressed: {
    opacity: 0.85,
  },
  thinkingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
  },
  thinkingText: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textSubtle,
  },
  launchingCard: {
    margin: tokens.spacing.lg,
    backgroundColor: tokens.colors.accentSoft,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  launchingTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  launchingSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSubtle,
    textAlign: 'center',
  },
  allowBtn: {
    marginTop: tokens.spacing.md,
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  allowBtnText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
