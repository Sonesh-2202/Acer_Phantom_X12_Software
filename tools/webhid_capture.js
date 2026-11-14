/*
 * Passive WebHID logger for the related YJX2012 configurator.
 * It observes HID traffic made by the page and forwards every call unchanged.
 * It does not request a device, open one, or send a report. It can attach to a
 * device already connected by the page, or run before the page's Connect action.
 */
(() => {
  if (!navigator.hid) {
    console.error("WebHID is unavailable. Use Chrome or Edge on the configurator tab.");
    return;
  }
  if (window.__YJX_HID_CAPTURE_INSTALLED__) {
    console.info("YJX WebHID capture is already installed.");
    return;
  }

  const capture = (window.__YJX_HID_CAPTURE__ = []);
  const time = () => new Date().toISOString();
  const bytesOf = (data) => Array.from(new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength));
  const record = (direction, device, details) => {
    const row = {
      time: time(),
      direction,
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName,
      ...details,
    };
    capture.push(row);
    console.log("[YJX HID]", JSON.stringify(row));
  };
  const instrument = (device) => {
    if (device.vendorId !== 0xA8A5 || device.productId !== 0x2255) return device;
    if (device.__yjxCaptureInstrumented) return device;
    Object.defineProperty(device, "__yjxCaptureInstrumented", { value: true });

    device.addEventListener("inputreport", (event) => {
      record("IN", device, { reportId: event.reportId, data: bytesOf(event.data) });
    });

    for (const method of ["sendReport", "sendFeatureReport"]) {
      const original = device[method].bind(device);
      device[method] = async (reportId, data) => {
        record("OUT", device, { method, reportId, data: bytesOf(data) });
        return original(reportId, data);
      };
    }

    const originalReceive = device.receiveFeatureReport.bind(device);
    device.receiveFeatureReport = async (reportId) => {
      const result = await originalReceive(reportId);
      record("FEATURE_IN", device, { reportId, data: bytesOf(result) });
      return result;
    };
    return device;
  };

  for (const method of ["requestDevice", "getDevices"]) {
    const original = navigator.hid[method].bind(navigator.hid);
    navigator.hid[method] = async (...args) => (await original(...args)).map(instrument);
  }
  window.__YJX_HID_CAPTURE_INSTALLED__ = true;
  console.info("YJX WebHID logger ready. It records page HID reports and forwards them unchanged.");
  console.info("After connecting and observing the untouched settings page, export with: copy(JSON.stringify(window.__YJX_HID_CAPTURE__, null, 2))");
  navigator.hid.getDevices().then((devices) => {
    const matches = devices.filter((device) => device.vendorId === 0xA8A5 && device.productId === 0x2255);
    matches.forEach(instrument);
    console.info(`[YJX HID] Attached to ${matches.length} already-authorized A8A5:2255 device(s).`, matches.map((d) => ({ productName: d.productName, opened: d.opened })));
  }).catch((error) => console.warn("[YJX HID] Could not enumerate already-authorized devices:", error));
})();
