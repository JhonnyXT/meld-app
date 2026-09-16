import WidgetKit
import SwiftUI

// SIN VERIFICAR — ver `WidgetShared.swift` para el detalle completo y el
// resto de los TODO de este target.

private struct TodayWidgetEntry: TimelineEntry {
    let date: Date
    let data: TodayWidgetSharedData
}

private struct TodayWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayWidgetEntry {
        TodayWidgetEntry(date: Date(), data: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayWidgetEntry) -> Void) {
        completion(TodayWidgetEntry(date: Date(), data: TodayWidgetSharedData.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayWidgetEntry>) -> Void) {
        let entry = TodayWidgetEntry(date: Date(), data: TodayWidgetSharedData.load())
        // Sin recurrencia propia — se apoya en `ExtensionStorage.reloadWidget()`
        // (llamado desde `refreshWidgets.ts` cada vez que cambian los ítems
        // de hoy) para refrescar antes. Este `.after` es solo un respaldo,
        // igual que `updatePeriodMillis` del lado Android.
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// A diferencia de Android (un widget continuo que se arrastra a cualquier
// tamaño, ver `androidWidgetTree.ts` → `pickVisibleItemCount`), WidgetKit
// SÍ trabaja con 3 tamaños fijos — el usuario elige uno al agregarlo, no lo
// arrastra. `itemLimit` decide cuántas filas entran en cada uno (a ojo,
// sin poder medir en un simulador real).
private struct TodayWidgetView: View {
    var data: TodayWidgetSharedData
    @Environment(\.widgetFamily) private var family

    private var itemLimit: Int {
        switch family {
        case .systemSmall: return 1
        case .systemLarge: return 8
        default: return 4 // .systemMedium
        }
    }

    private var visibleItems: [TodayWidgetItem] {
        Array(data.items.prefix(itemLimit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 12) {
            HStack {
                Text("Hoy")
                    .font(.system(size: family == .systemSmall ? 15 : 17, weight: .heavy))
                    .foregroundColor(.white)
                Spacer()
                WidgetCountPill(text: "\(data.doneCount)/\(data.totalCount)")
            }
            if data.items.isEmpty {
                VStack(spacing: 6) {
                    Image(systemName: "sun.max")
                        .font(.system(size: 20))
                        .foregroundColor(dimColor)
                    Text("Nada agendado")
                        .font(.system(size: 13))
                        .foregroundColor(dimColor)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 9) {
                    ForEach(visibleItems, id: \.id) { item in
                        HStack(spacing: 8) {
                            Image(systemName: item.sfSymbol)
                                .font(.system(size: 12))
                                .foregroundColor(dimColor)
                                .frame(width: 16)
                            Text(item.timeLabel)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundColor(accentColor)
                                .frame(width: 56, alignment: .leading)
                            Text(item.title)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white)
                                .lineLimit(1)
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

struct TodayWidget: Widget {
    let kind: String = "TodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayWidgetProvider()) { entry in
            TodayWidgetView(data: entry.data)
                .containerBackground(widgetBg, for: .widget)
        }
        .configurationDisplayName("Meld — Hoy")
        .description("Lista de lo que tienes agendado hoy.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
