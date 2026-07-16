// swift-tools-version:5.9
import PackageDescription

// Standalone, framework-free Swift port of the lot-matching / P&L engine.
// Kept as its own package so it compiles and tests on a plain Swift toolchain
// (Linux CI, no Mac needed) and is later linked into the SwiftUI iOS app.
let package = Package(
    name: "Engine",
    products: [
        .library(name: "Engine", targets: ["Engine"])
    ],
    targets: [
        .target(name: "Engine"),
        .testTarget(name: "EngineTests", dependencies: ["Engine"])
    ]
)
