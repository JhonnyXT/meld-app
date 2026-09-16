import WidgetKit
import SwiftUI

// SIN VERIFICAR — ver `WidgetShared.swift`.

private struct HabitsEntry: TimelineEntry {
    let date: Date
    let data: HabitsWidgetSharedData
}

private struct HabitsProvider: TimelineProvider {
    func placeholder(in context: Context) -> HabitsEntry {
        HabitsEntry(date: Date(), data: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (HabitsEntry) -> Void) {
        completion(HabitsEntry(date: Date(), data: HabitsWidgetSharedData.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HabitsEntry>) -> Void) {
        let entry = HabitsEntry(date: Date(), data: HabitsWidgetSharedData.load())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

private struct HabitsWidgetView: View {
    var data: HabitsWidgetSharedData
    @Environment(\.widgetFamily) private var family

    private var itemLimit: Int {
        switch family {
        case .systemLarge: return 8
        default: return 4 // .systemMedium
        }
    }

    private var visibleRows: [HabitWidgetItem] {
        Array(data.rows.prefix(itemLimit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Hábitos")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundColor(.white)
                Spacer()
                WidgetCountPill(text: "\(data.doneCount)/\(data.totalCount)")
            }
            if data.rows.isEmpty {
                Text("Sin hábitos hoy")
                    .font(.system(size: 13))
                    .foregroundColor(dimColor)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 9) {
                    ForEach(visibleRows, id: \.id) { row in
                        HStack {
                            HStack(spacing: 8) {
                                Image(systemName: "repeat")
                                    .font(.system(size: 12))
                                    .foregroundColor(dimColor)
                                    .frame(width: 16)
                                Text(row.title)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                            Spacer()
                            HStack(spacing: 6) {
                                Text("🔥\(row.streak)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(accentColor)
                                Text(row.progress)
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .foregroundColor(dimColor)
                            }
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "\(widgetDeepLinkScheme)://"))
    }
}

struct HabitsWidget: Widget {
    let kind: String = "HabitsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HabitsProvider()) { entry in
            HabitsWidgetView(data: entry.data)
                .containerBackground(widgetBg, for: .widget)
        }
        .configurationDisplayName("Meld — Hábitos")
        .description("Tus hábitos de hoy, con racha y progreso semanal.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
