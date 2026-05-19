import React, { useRef, useState, useCallback } from 'react'
import { View, FlatList, StyleSheet, Dimensions, StatusBar, type ViewToken } from 'react-native'
import { ScrollCard } from '@/src/components/scrolls/ScrollCard'
import { DEMO_SCROLLS, type ScrollItem } from '@/src/data/demoScrolls'
import { useLanguageStore } from '@/src/store/languageStore'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function ScrollsScreen() {
  useLanguageStore((s) => s.locale)
  const [activeIndex, setActiveIndex] = useState(0)

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
        setActiveIndex(viewableItems[0].index)
      }
    },
  ).current

  const renderItem = useCallback(
    ({ item, index }: { item: ScrollItem; index: number }) => (
      <ScrollCard scroll={item} isVisible={index === activeIndex} />
    ),
    [activeIndex],
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList<ScrollItem>
        data={DEMO_SCROLLS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
