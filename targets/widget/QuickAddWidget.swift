import WidgetKit
import SwiftUI

// SIN VERIFICAR — ver `WidgetShared.swift`.

private struct QuickAddEntry: TimelineEntry {
    let date: Date
}

/// Estático — no depende de la DB, así que un solo entry con política
/// `.never` alcanza (no hace falta recurrencia ni `ExtensionStorage`).
private struct QuickAddProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickAddEntry {
        QuickAddEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickAddEntry) -> Void) {
        completion(QuickAddEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAddEntry>) -> Void) {
        completion(Timeline(entries: [QuickAddEntry(date: Date())], policy: .never))
    }
}

// A diferencia de Android (grilla propia de cada launcher, ver
// `widgetScale.ts` — Samsung One UI le dio al widget un tamaño bastante más
// grande que el mock de referencia, dejando el FAB chico y perdido, bug
// real corregido ahí), WidgetKit usa tamaños FIJOS y conocidos por familia
// (`.systemSmall` ronda ~155x155pt en la mayoría de los dispositivos) — no
// hace falta la misma lógica de escalado acá.
private struct QuickAddWidgetView: View {
    var body: some View {
        VStack(alignment: .leading) {
            Text("Agregar")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            Spacer()
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 52, height: 52)
                    Image(systemName: "plus")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(quickAddWidgetURL)
    }
}

struct QuickAddWidget: Widget {
    let kind: String = "QuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickAddProvider()) { _ in
            QuickAddWidgetView()
                .containerBackground(widgetBg, for: .widget)
        }
        .configurationDisplayName("Meld — Agregar rápido")
        .description("Un toque para agregar algo, sin abrir la app primero.")
        .supportedFamilies([.systemSmall])
    }
}
