import SwiftUI
import Engine

// Minimal first screen. Its only job right now is to prove the app links and runs
// the shared Swift engine. Real screens (net worth, positions, trade entry) and
// the Firebase data layer come next.
struct ContentView: View {
    private var sampleRealizedGain: Double {
        let txns = [
            EngineTransaction(id: 1, type: .buy, date: "2020-01-01", quantity: 10, amount: 1000),
            EngineTransaction(id: 2, type: .sell, date: "2021-06-01", quantity: 5, amount: 1500)
        ]
        let gains = (try? replayPair(txns, .fifo))?.gains ?? []
        return gains.reduce(0) { $0 + $1.gain }
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("💼 TradeApp")
                .font(.largeTitle).bold()
            Text("Engine linked ✓")
                .foregroundStyle(.green)
            Text("Sample realized gain: $\(sampleRealizedGain, specifier: "%.2f")")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
