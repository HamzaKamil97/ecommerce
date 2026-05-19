import React from 'react'
import { View, Text, ScrollView, SafeAreaView, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/src/store/authStore'
import { tokens } from '@/src/theme/tokens'
import { MenuRow } from '@/src/components/account/MenuRow'
import { AppButton } from '@/src/components/AppButton'

const APP_VERSION = '1.0.0-beta'

function getInitials(first?: string | null, last?: string | null): string {
  const f = (first ?? '').trim().charAt(0).toUpperCase()
  const l = (last ?? '').trim().charAt(0).toUpperCase()
  return f + l || '?'
}

export default function ProfileScreen() {
  const customer = useAuthStore((s) => s.customer)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.heading}>Account</Text>

        {customer ? (
          <>
            {/* Header card */}
            <View style={styles.headerCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitials(customer.first_name, customer.last_name)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {customer.first_name ?? ''} {customer.last_name ?? ''}
                </Text>
                <Text style={styles.userContact}>{customer.email}</Text>
                {customer.phone ? <Text style={styles.userContact}>{customer.phone}</Text> : null}
              </View>
              <Pressable
                onPress={() => router.push('/profile/edit')}
                style={({ pressed }) => [styles.editProfileBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.editProfileText}>Edit</Text>
              </Pressable>
            </View>

            {/* Quick stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxBorder]}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Addresses</Text>
              </View>
            </View>

            {/* Menu */}
            <View style={styles.menuGroup}>
              <MenuRow icon="📦" label="My orders" onPress={() => router.push('/(tabs)/orders')} />
              <MenuRow icon="📍" label="Addresses" onPress={() => router.push('/addresses')} />
              <MenuRow icon="💳" label="Payment methods" onPress={() => {}} />
              <MenuRow icon="🎁" label="Rewards & referrals" onPress={() => router.push('/loyalty')} />
              <MenuRow icon="💰" label="Wallet" onPress={() => router.push('/wallet')} />
            </View>

            <View style={[styles.menuGroup, { marginTop: tokens.spacing.md }]}>
              <MenuRow icon="🌐" label="Language" value="English" onPress={() => {}} />
              <MenuRow icon="🔔" label="Notifications" onPress={() => router.push('/notifications')} />
              <MenuRow icon="❤️" label="Favorites" onPress={() => {}} />
            </View>

            <View style={[styles.menuGroup, { marginTop: tokens.spacing.md }]}>
              <MenuRow icon="💬" label="Help & support" onPress={() => {}} />
              <MenuRow icon="📄" label="Terms & conditions" onPress={() => {}} />
              <MenuRow icon="🔒" label="Privacy policy" onPress={() => {}} />
            </View>

            {/* Sign out */}
            <View style={styles.signOutWrapper}>
              <Pressable
                onPress={logout}
                style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </View>
          </>
        ) : (
          /* Unauthenticated state */
          <View style={styles.authCard}>
            <View style={styles.avatarCircleGhost}>
              <Text style={styles.avatarTextGhost}>?</Text>
            </View>
            <Text style={styles.authTitle}>Sign in to Hanoot</Text>
            <Text style={styles.authSubtitle}>
              Access your orders, rewards, wallet, and personalized recommendations.
            </Text>
            <View style={styles.authButtons}>
              <AppButton title="Log in" onPress={() => router.push('/auth/login')} />
              <AppButton
                title="Create account"
                variant="secondary"
                onPress={() => router.push('/auth/register')}
              />
            </View>

            {/* Guest menu */}
            <View style={[styles.menuGroup, { marginTop: tokens.spacing.xl }]}>
              <MenuRow icon="💬" label="Help & support" onPress={() => {}} />
              <MenuRow icon="📄" label="Terms & conditions" onPress={() => {}} />
              <MenuRow icon="🌐" label="Language" value="English" onPress={() => {}} />
            </View>
          </View>
        )}

        {/* App version */}
        <Text style={styles.version}>Hanoot v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  heading: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primary,
    marginHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  userContact: {
    fontSize: tokens.fontSize.sm,
    color: 'rgba(255,255,255,0.78)',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.border,
  },
  statValue: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  statLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  menuGroup: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.border,
  },
  signOutWrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
  },
  signOutBtn: {
    height: 52,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.danger,
  },
  authCard: {
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  avatarCircleGhost: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
    borderWidth: 2,
    borderColor: tokens.colors.border,
  },
  avatarTextGhost: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textMuted,
  },
  authTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  authButtons: {
    width: '100%',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  version: {
    textAlign: 'center',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSubtle,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },
  editProfileBtn: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.white,
  },
})
