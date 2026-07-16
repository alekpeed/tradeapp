import Foundation

// Swift port of src/shared/engine.ts — the single source of truth for how
// transactions become open lots and realized gains. This must stay byte-for-byte
// equivalent in behavior to the TypeScript engine (desktop) so P&L matches across
// platforms. Verified by EngineTests (the same assertions as the TS harness).

public enum TransactionType: String, Codable {
    case buy, sell, dividend, interest, split
    case transferIn = "transfer_in"
    case transferOut = "transfer_out"
    case fee, deposit, withdrawal
}

public enum CostBasisMethod: String, Codable {
    case fifo, lifo, average
    case specificLot = "specific_lot"
}

public enum GainTerm: String, Codable {
    case short, long
}

public enum EngineError: Error, Equatable {
    case oversell(quantity: Double, date: String, available: Double)
    case invalidSplit(ratio: Double)
}

public struct EngineTransaction {
    public let id: Int
    public let type: TransactionType
    public let date: String
    public let quantity: Double
    public let amount: Double
    public let estimatedBasis: Bool
    public let specificLotId: Int?

    public init(id: Int, type: TransactionType, date: String, quantity: Double,
                amount: Double, estimatedBasis: Bool = false, specificLotId: Int? = nil) {
        self.id = id
        self.type = type
        self.date = date
        self.quantity = quantity
        self.amount = amount
        self.estimatedBasis = estimatedBasis
        self.specificLotId = specificLotId
    }
}

public struct EngineLot {
    public var id: Int
    public var openTransactionId: Int
    public var acquiredDate: String
    public var originalQuantity: Double
    public var remainingQuantity: Double
    public var costBasisPerUnit: Double
    public var costBasisTotal: Double
    public var estimatedBasis: Bool
    public var closedAt: String?
}

public struct EngineGain {
    public var sellTransactionId: Int
    public var lotId: Int
    public var quantity: Double
    public var proceeds: Double
    public var costBasis: Double
    public var gain: Double
    public var term: GainTerm
    public var holdingPeriodDays: Int
    public var acquiredDate: String
    public var soldDate: String
}

public struct ReplayResult {
    public let lots: [EngineLot]
    public let gains: [EngineGain]
}

private let openingTypes: Set<TransactionType> = [.buy, .transferIn]
private let closingTypes: Set<TransactionType> = [.sell, .transferOut]

private func parseDate(_ s: String) -> Date? {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.timeZone = TimeZone(identifier: "UTC")
    fmt.locale = Locale(identifier: "en_US_POSIX")
    return fmt.date(from: String(s.prefix(10)))
}

/// Whole days between two ISO dates; >365 days is long-term (matches the TS engine).
public func holdingPeriod(_ acquiredDate: String, _ soldDate: String) -> (term: GainTerm, days: Int) {
    guard let a = parseDate(acquiredDate), let s = parseDate(soldDate) else {
        return (.short, 0)
    }
    let days = Int(floor(s.timeIntervalSince(a) / 86_400.0))
    return (days > 365 ? .long : .short, days)
}

/// amount = quantity*price, fees added to cost on opens and netted from proceeds on closes.
public func computeAmount(type: TransactionType, quantity: Double, price: Double, fees: Double) -> Double {
    return quantity * price + (openingTypes.contains(type) ? fees : -fees)
}

private func weightedAverageCostPerUnit(_ lots: [EngineLot], _ indices: [Int]) -> Double {
    let totalQty = indices.reduce(0.0) { $0 + lots[$1].remainingQuantity }
    if totalQty == 0 { return 0 }
    let totalCost = indices.reduce(0.0) { $0 + lots[$1].remainingQuantity * lots[$1].costBasisPerUnit }
    return totalCost / totalQty
}

/// Indices into `lots` of the open lots eligible to satisfy a close, in consumption order.
private func openLotIndices(_ lots: [EngineLot], _ method: CostBasisMethod, _ specificLotId: Int?) -> [Int] {
    let open = lots.indices.filter { lots[$0].remainingQuantity > 0 }
    if method == .specificLot, let sid = specificLotId {
        return open.filter { lots[$0].id == sid }
    }
    let ascending = method != .lifo
    return open.sorted { a, b in
        let la = lots[a], lb = lots[b]
        if la.acquiredDate != lb.acquiredDate {
            return ascending ? la.acquiredDate < lb.acquiredDate : la.acquiredDate > lb.acquiredDate
        }
        return ascending ? la.id < lb.id : la.id > lb.id
    }
}

/// Replay every transaction for ONE account+instrument pair, in (date, id) order,
/// into open lots and realized gains. Throws on an oversell or a non-positive split.
public func replayPair(_ transactions: [EngineTransaction], _ accountMethod: CostBasisMethod) throws -> ReplayResult {
    let ordered = transactions.sorted { a, b in
        if a.date != b.date { return a.date < b.date }
        return a.id < b.id
    }

    var lots: [EngineLot] = []
    var gains: [EngineGain] = []

    for txn in ordered {
        if openingTypes.contains(txn.type) {
            lots.append(EngineLot(
                id: txn.id,
                openTransactionId: txn.id,
                acquiredDate: txn.date,
                originalQuantity: txn.quantity,
                remainingQuantity: txn.quantity,
                costBasisPerUnit: txn.amount / txn.quantity,
                costBasisTotal: txn.amount,
                estimatedBasis: txn.estimatedBasis,
                closedAt: nil
            ))
        } else if closingTypes.contains(txn.type) {
            let method: CostBasisMethod = txn.specificLotId != nil ? .specificLot : accountMethod
            let indices = openLotIndices(lots, method, txn.specificLotId)
            let availableQty = indices.reduce(0.0) { $0 + lots[$1].remainingQuantity }
            if availableQty + 1e-9 < txn.quantity {
                throw EngineError.oversell(quantity: txn.quantity, date: txn.date, available: availableQty)
            }

            let avgCost: Double? = method == .average ? weightedAverageCostPerUnit(lots, indices) : nil
            let proceedsPerUnit = txn.amount / txn.quantity
            var remainingToSell = txn.quantity

            for i in indices {
                if remainingToSell <= 1e-9 { break }
                let qtyFromLot = min(lots[i].remainingQuantity, remainingToSell)
                let costPerUnit = avgCost ?? lots[i].costBasisPerUnit
                let costBasis = qtyFromLot * costPerUnit
                let proceeds = qtyFromLot * proceedsPerUnit
                let hp = holdingPeriod(lots[i].acquiredDate, txn.date)

                gains.append(EngineGain(
                    sellTransactionId: txn.id,
                    lotId: lots[i].id,
                    quantity: qtyFromLot,
                    proceeds: proceeds,
                    costBasis: costBasis,
                    gain: proceeds - costBasis,
                    term: hp.term,
                    holdingPeriodDays: hp.days,
                    acquiredDate: lots[i].acquiredDate,
                    soldDate: txn.date
                ))

                lots[i].remainingQuantity -= qtyFromLot
                if lots[i].remainingQuantity <= 0 { lots[i].closedAt = txn.date }
                remainingToSell -= qtyFromLot
            }
        } else if txn.type == .split {
            if txn.quantity <= 0 { throw EngineError.invalidSplit(ratio: txn.quantity) }
            for i in lots.indices where lots[i].remainingQuantity > 0 {
                lots[i].remainingQuantity *= txn.quantity
                lots[i].costBasisPerUnit /= txn.quantity
            }
        }
        // dividend / interest / fee / deposit / withdrawal carry no lot effect.
    }

    return ReplayResult(lots: lots, gains: gains)
}
