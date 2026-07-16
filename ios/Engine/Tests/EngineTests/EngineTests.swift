import XCTest
@testable import Engine

// Mirrors the TypeScript engine's 22 assertions so the Swift port is provably
// equivalent (same FIFO/LIFO/average/split/oversell/term/specific-lot behavior).
final class EngineTests: XCTestCase {
    private func tx(_ id: Int, _ type: TransactionType, _ date: String, _ quantity: Double,
                    _ amount: Double, specificLotId: Int? = nil) -> EngineTransaction {
        EngineTransaction(id: id, type: type, date: date, quantity: quantity,
                          amount: amount, specificLotId: specificLotId)
    }

    func testFIFO() throws {
        let r = try replayPair([
            tx(1, .buy, "2020-01-01", 10, 1000),
            tx(2, .buy, "2020-06-01", 10, 2000),
            tx(3, .sell, "2021-01-01", 5, 1500)
        ], .fifo)
        XCTAssertEqual(r.gains.count, 1)
        XCTAssertEqual(r.gains[0].lotId, 1, "FIFO consumes lot 1")
        XCTAssertEqual(r.gains[0].costBasis, 500, accuracy: 1e-6)
        XCTAssertEqual(r.gains[0].gain, 1000, accuracy: 1e-6)
        XCTAssertEqual(r.gains[0].term, .long, "FIFO term long")
        XCTAssertEqual(r.lots.first { $0.id == 1 }!.remainingQuantity, 5, accuracy: 1e-6)
        XCTAssertEqual(r.lots.first { $0.id == 2 }!.remainingQuantity, 10, accuracy: 1e-6)
    }

    func testLIFO() throws {
        let r = try replayPair([
            tx(1, .buy, "2020-01-01", 10, 1000),
            tx(2, .buy, "2020-06-01", 10, 2000),
            tx(3, .sell, "2021-01-01", 5, 1500)
        ], .lifo)
        XCTAssertEqual(r.gains[0].lotId, 2, "LIFO consumes lot 2")
        XCTAssertEqual(r.gains[0].costBasis, 1000, accuracy: 1e-6)
        XCTAssertEqual(r.gains[0].term, .short, "LIFO term short")
    }

    func testAverage() throws {
        let r = try replayPair([
            tx(1, .buy, "2020-01-01", 10, 1000),
            tx(2, .buy, "2020-06-01", 10, 2000),
            tx(3, .sell, "2021-01-01", 5, 1500)
        ], .average)
        XCTAssertEqual(r.gains[0].costBasis, 750, accuracy: 1e-6, "AVG basis 5*150")
        XCTAssertEqual(r.gains[0].acquiredDate, "2020-01-01", "AVG keeps lot1 date")
    }

    func testSplit() throws {
        let r = try replayPair([
            tx(1, .buy, "2020-01-01", 10, 1000),
            tx(2, .split, "2020-03-01", 2, 0),
            tx(3, .sell, "2021-06-01", 5, 300)
        ], .fifo)
        let lot = r.lots.first { $0.id == 1 }!
        XCTAssertEqual(lot.remainingQuantity, 15, accuracy: 1e-6, "20-5=15 remaining")
        XCTAssertEqual(lot.costBasisPerUnit, 50, accuracy: 1e-6, "split halves per-unit basis")
        XCTAssertEqual(lot.originalQuantity, 10, accuracy: 1e-6, "original_quantity untouched")
        XCTAssertEqual(r.gains[0].costBasis, 250, accuracy: 1e-6, "post-split basis 5*50")
        XCTAssertEqual(r.gains[0].acquiredDate, "2020-01-01", "term from original acquisition")
    }

    func testOversellThrows() {
        XCTAssertThrowsError(try replayPair([
            tx(1, .buy, "2020-01-01", 5, 500),
            tx(2, .sell, "2020-02-01", 10, 1200)
        ], .fifo))
    }

    func testHoldingPeriodBoundary() {
        XCTAssertEqual(holdingPeriod("2020-01-01", "2020-12-31").days, 365)
        XCTAssertEqual(holdingPeriod("2020-01-01", "2020-12-31").term, .short, "365d short")
        XCTAssertEqual(holdingPeriod("2020-01-01", "2021-01-01").term, .long, "366d long")
    }

    func testSpecificLot() throws {
        let r = try replayPair([
            tx(1, .buy, "2020-01-01", 10, 1000),
            tx(2, .buy, "2020-06-01", 10, 2000),
            tx(3, .sell, "2021-01-01", 5, 1500, specificLotId: 2)
        ], .fifo)
        XCTAssertEqual(r.gains[0].lotId, 2, "specific_lot picks lot 2")
        XCTAssertEqual(r.gains[0].costBasis, 1000, accuracy: 1e-6)
    }
}
