import SwiftUI

// SIN VERIFICAR — este target nunca se compiló ni corrió en un simulador/
// dispositivo real (proyecto desarrollado en Linux, sin Xcode/macOS). Ver
// CLAUDE.md → "Widget de pantalla de inicio" para el detalle completo antes
// de retomar esto en una Mac.
//
// TODO al retomar en una Mac: si se está construyendo el variant `test` o
// `prod` (no `dev`), actualizar `appGroup` para que coincida con
// `widgetAppGroup` de `app.config.ts` para ESE variant — ahí se arma como
// `group.<bundleIdentifier>.widget`, y el `bundleIdentifier` cambia por
// variant (`app.meld.mobile` / `app.meld.mobile.test` / `app.meld`). No hay
// forma de leer esto dinámicamente desde Swift sin Xcode para inyectarlo en
// build time, así que queda hardcodeado a propósito.
let appGroup = "group.app.meld.mobile.widget"

// Mismo scheme del variant `dev` — actualizar a "meld-test://"/"meld-prod://"
// si se compila para esos variants (mismo TODO que `appGroup`).
let widgetDeepLinkScheme = "meld"

// Paleta y layout calcados de los mocks "Widget - ..." en
// `designs/trove-splash.pen` (mismo diseño que el lado Android,
// `src/widget/*AndroidWidget.tsx`) — ver CLAUDE.md → "Widget de pantalla de
// inicio".
let widgetBg = Color(red: 0.11, green: 0.11, blue: 0.12) // #1C1C1E
let dimColor = Color(red: 0.557, green: 0.557, blue: 0.576) // #8E8E93
let accentColor = Color(red: 1, green: 0.294, blue: 0.4) // #FF4B66
let pillColor = Color(red: 0.165, green: 0.165, blue: 0.173) // #2A2A2C

/// Un ítem tal como lo escribe `ExtensionStorage` desde
/// `src/widget/refreshWidgets.ts` — mismas 4 claves (`id`/`title`/
/// `timeLabel`/`type`), todas string para que entren en el tipo que soporta
/// `ExtensionStorage.set` (`Array<Record<string, string | number>>`).
struct TodayWidgetItem: Decodable {
    let id: String
    let title: String
    let timeLabel: String
    /// Uno de los 6 `DayItem.type` del dominio (`task`/`event`/`habit`/
    /// `note`/`voiceMemo`/`moment`) — decide el SF Symbol, ver `sfSymbol`.
    let type: String

    var sfSymbol: String {
        switch type {
        case "task": return "checkmark.square"
        case "event": return "calendar"
        case "voiceMemo": return "mic.fill"
        case "note": return "doc.text"
        case "habit": return "repeat"
        case "moment": return "photo"
        default: return "circle"
        }
    }
}

struct TodayWidgetSharedData {
    let dateKey: String
    let doneCount: Int
    let totalCount: Int
    let items: [TodayWidgetItem]

    static let empty = TodayWidgetSharedData(dateKey: "", doneCount: 0, totalCount: 0, items: [])

    static func load() -> TodayWidgetSharedData {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return .empty }
        let dateKey = defaults.string(forKey: "todayDateKey") ?? ""
        let doneCount = defaults.integer(forKey: "todayDoneCount")
        let totalCount = defaults.integer(forKey: "todayTotalCount")
        var items: [TodayWidgetItem] = []
        if let raw = defaults.string(forKey: "todayItems"), let data = raw.data(using: .utf8) {
            items = (try? JSONDecoder().decode([TodayWidgetItem].self, from: data)) ?? []
        }
        return TodayWidgetSharedData(dateKey: dateKey, doneCount: doneCount, totalCount: totalCount, items: items)
    }
}

/// Fila del widget "Hábitos" — ver `src/widget/habitsWidgetData.ts` →
/// `HabitWidgetRow` (mismas claves, `completedToday` se descarta del lado
/// JS antes de escribir porque `ExtensionStorage.set` no acepta booleans).
struct HabitWidgetItem: Decodable {
    let id: String
    let title: String
    /// "5/7" — progreso semanal, ya formateado del lado JS.
    let progress: String
    let streak: Int
}

struct HabitsWidgetSharedData {
    let doneCount: Int
    let totalCount: Int
    let rows: [HabitWidgetItem]

    static let empty = HabitsWidgetSharedData(doneCount: 0, totalCount: 0, rows: [])

    static func load() -> HabitsWidgetSharedData {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return .empty }
        let doneCount = defaults.integer(forKey: "habitsDoneCount")
        let totalCount = defaults.integer(forKey: "habitsTotalCount")
        var rows: [HabitWidgetItem] = []
        if let raw = defaults.string(forKey: "habitsRows"), let data = raw.data(using: .utf8) {
            rows = (try? JSONDecoder().decode([HabitWidgetItem].self, from: data)) ?? []
        }
        return HabitsWidgetSharedData(doneCount: doneCount, totalCount: totalCount, rows: rows)
    }
}

/// Pill redondeada del conteo "X/Y" — reusada por los 4 widgets (mismo
/// look que la pill de `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx`).
struct WidgetCountPill: View {
    var text: String

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold, design: .monospaced))
            .foregroundColor(dimColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(pillColor)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

/// Deep link al widget "Agregar rápido" — abre Quick Add directo (ver
/// `app/_layout.tsx` → `handleDeepLink`, mismo query param
/// `openQuickAdd` que arma el lado Android con `Linking.createURL`).
let quickAddWidgetURL = URL(string: "\(widgetDeepLinkScheme)://?openQuickAdd=task")
