import WidgetKit
import SwiftUI

// SIN VERIFICAR — ver `WidgetShared.swift`.

private struct ProgressEntry: TimelineEntry {
    let date: Date
    let data: TodayWidgetSharedData
}

private struct ProgressProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProgressEntry {
        ProgressEntry(date: Date(), data: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (ProgressEntry) -> Void) {
        completion(ProgressEntry(date: Date(), data: TodayWidgetSharedData.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProgressEntry>) -> Void) {
        let entry = ProgressEntry(date: Date(), data: TodayWidgetSharedData.load())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

/// Mismos `doneCount`/`totalCount` que el header del widget "Hoy" — ver la
/// misma simplificación conocida en `todayWidgetData.ts` (no inyecta
/// ocurrencias recurrentes de hábitos).
private struct ProgressWidgetView: View {
    var data: TodayWidgetSharedData

    var body: some View {
        VStack(alignment: .leading) {
            Text("Hoy")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            Spacer()
            VStack(spacing: 2) {
                Text("\(data.doneCount)/\(data.totalCount)")
                    .font(.system(size: 34, weight: .heavy, design: .monospaced))
                    .foregroundColor(accentColor)
                Text("hechas hoy")
                    .font(.system(size: 12))
                    .foregroundColor(dimColor)
            }
            .frame(maxWidth: .infinity)
            Spacer()
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "\(widgetDeepLinkScheme)://"))
    }
}

struct ProgressWidget: Widget {
    let kind: String = "ProgressWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProgressProvider()) { entry in
            ProgressWidgetView(data: entry.data)
                .containerBackground(widgetBg, for: .widget)
        }
        .configurationDisplayName("Meld — Progreso del día")
        .description("Cuánto llevas hecho hoy, de un vistazo.")
        .supportedFamilies([.systemSmall])
    }
}
