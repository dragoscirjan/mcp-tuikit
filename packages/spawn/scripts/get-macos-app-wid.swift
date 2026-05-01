import CoreGraphics
import Foundation

let pid = Int32(CommandLine.arguments[1])!
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]

for w in windows {
    if let wpid = w[kCGWindowOwnerPID as String] as? Int32, wpid == pid {
        if let bounds = w[kCGWindowBounds as String] as? [String: Any],
           let width = bounds["Width"] as? CGFloat, width > 100,
           let height = bounds["Height"] as? CGFloat, height > 100 {
            let result: [String: Any] = [
                "window_id":   w[kCGWindowNumber as String] ?? NSNull(),
                "owner_name":  w[kCGWindowOwnerName as String] ?? NSNull(),
                "owner_pid":   w[kCGWindowOwnerPID as String] ?? NSNull(),
                "title":       w[kCGWindowName as String] ?? NSNull(),
                "layer":       w[kCGWindowLayer as String] ?? NSNull(),
                "alpha":       w[kCGWindowAlpha as String] ?? NSNull(),
                "bounds":      bounds
            ]
            let json = try! JSONSerialization.data(withJSONObject: result, options: .prettyPrinted)
            print(String(data: json, encoding: .utf8)!)
            break
        }
    }
}

