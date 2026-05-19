import React from 'react'
import { View, FlatList, StyleSheet, Dimensions, StatusBar } from 'react-native'
import { ScrollCard } from '@/src/components/scrolls/ScrollCard'
import { DEMO_SCROLLS, type ScrollItem } from '@/src/data/demoScrolls'
import { useLanguageStore } from '@/src/store/languageStore'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function ScrollsScreen() {
  useLanguageStore((s) => s.locale)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList<ScrollItem>
        data={DEMO_SCROLLS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ScrollCard scroll={item} />}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
})
