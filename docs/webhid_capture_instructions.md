# Read-only WebHID capture instructions

The candidate configurator is [https://x1a11.yjx2012.com/](https://x1a11.yjx2012.com/), labeled **K-Snake X11** and not confirmed compatible with the Acer mouse. It requires Chrome or Edge. This is a related OEM page, not Acer support.

1. Leave the page connected as it is in your screenshots. Keep the mouse in **2.4 GHz** mode and the receiver plugged in.
2. Press **F12** to open Developer Tools. Select the **Sources** tab, then **Snippets** in the left panel. If Snippets is hidden, use the `»` overflow menu beside the tab names.
3. Click **+ New snippet** (or right-click the Snippets pane and choose **New**). A blank editor opens.
4. Open [`../tools/webhid_capture.js`](../tools/webhid_capture.js) from the project folder in Notepad or VS Code. Copy the whole file and paste it into the blank Snippet editor.
5. Run the snippet with **Ctrl+Enter**. Open the **Console** tab and look for `YJX WebHID logger ready` and `Attached to 1 already-authorized A8A5:2255 device(s)`. The script only records and forwards WebHID calls; it does not initiate a request or send reports.
6. With the logger attached, use only the page navigation icons on the left to visit the mouse/button, DPI/lighting, and macro pages. Wait a few seconds on each page. Do not change slider/dropdown values.
7. If comfortable, press the physical DPI button once to capture its normal stage-change notification. This cycles the active DPI stage; skip it if you want to leave the stage unchanged.
8. Do not click **恢复出厂设置** (restore factory settings), **确定** (confirm/apply), Save, Reset, or Firmware Update.
9. Switch to the **Console** tab and run:

   ```js
   copy(JSON.stringify(window.__YJX_HID_CAPTURE__, null, 2))
   ```

10. Open Notepad, paste the copied JSON, save it as `hid-capture.json`, and attach that file here. If the console says it attached to zero devices, send a screenshot of the Console instead; do not reconnect or change settings.

The capture script does not generate HID traffic on its own and does not alter the page's reports. This procedure uses the existing browser connection and requires no driver, download, or system setting change.
