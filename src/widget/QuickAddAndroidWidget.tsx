import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import * as Linking from 'expo-linking';
import { WIDGET_PLUS_ICON_SVG } from './androidIcons';
import { widgetContentScale } from './widgetScale';

const BG = '#1C1C1E';
const TEXT = '#FFFFFF';
const CORAL = '#FF4B66';

interface QuickAddAndroidWidgetProps {
  label: string;
  width?: number;
  height?: number;
}

export function QuickAddAndroidWidget({ label, width, height }: QuickAddAndroidWidgetProps) {
  const scale = widgetContentScale(width, height);
  const fabSize = Math.round(52 * scale);
  const plusSize = Math.round(24 * scale);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: Linking.createURL('/', { queryParams: { openQuickAdd: 'task' } }) }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget text={label} style={{ fontSize: 15, fontWeight: '700', color: TEXT }} />
      {/* ver docs/adr/0021-peculiaridades-layout-android-widget.md */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'center' }}>
        <FlexWidget
          style={{
            width: fabSize,
            height: fabSize,
            backgroundColor: CORAL,
            borderRadius: fabSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <SvgWidget svg={WIDGET_PLUS_ICON_SVG} style={{ width: plusSize, height: plusSize }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
