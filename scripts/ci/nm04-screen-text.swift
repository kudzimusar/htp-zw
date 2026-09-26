import Foundation
import Vision

guard CommandLine.arguments.count == 2 else {
  fputs("usage: nm04-screen-text.swift screenshot.png\n", stderr)
  exit(2)
}

let screenshot = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

do {
  try VNImageRequestHandler(url: screenshot).perform([request])
  for observation in request.results ?? [] {
    if let text = observation.topCandidates(1).first?.string {
      print(text)
    }
  }
} catch {
  fputs("screen text recognition failed: \(error)\n", stderr)
  exit(1)
}
