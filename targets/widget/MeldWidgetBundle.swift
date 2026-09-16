import WidgetKit
import SwiftUI

// SIN VERIFICAR — ver `WidgetShared.swift`. Un solo `@main` para los 4
// widgets del target (uno por archivo: `TodayWidget.swift`/
// `QuickAddWidget.swift`/`ProgressWidget.swift`/`HabitsWidget.swift`) — solo
// puede haber UN punto de entrada `@main` por target.
@main
struct MeldWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        QuickAddWidget()
        ProgressWidget()
        HabitsWidget()
    }
}
