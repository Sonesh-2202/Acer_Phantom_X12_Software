"""Initial dark Qt interface with honest read-only device controls."""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from pathlib import Path

from PySide6.QtCore import Qt, QThread, QTimer, Signal
from PySide6.QtGui import QColor, QPainter, QPainterPath, QPen
from PySide6.QtWidgets import (
    QAbstractItemView,
    QComboBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QLineEdit,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSlider,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from core.transport import DeviceState, DeviceUnavailableError, ReadOnlyHidClient
from services.macros import Macro
from services.profiles import Profile, ProfileStore

ROOT = Path(__file__).resolve().parents[1]
APP_DATA = (
    Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "AcerPhantomX12Control"
    if getattr(sys, "frozen", False)
    else ROOT
)
ACCENT = "#78BE20"
SUBTLE = "#9AA2A9"


class ReadStateWorker(QThread):
    """Runs device reads off the UI thread."""

    succeeded = Signal(object)
    failed = Signal(str)

    def __init__(self, client: ReadOnlyHidClient) -> None:
        super().__init__()
        self.client = client

    def run(self) -> None:
        try:
            self.succeeded.emit(self.client.read_state())
        except (DeviceUnavailableError, TimeoutError, OSError, ValueError, RuntimeError) as exc:
            self.failed.emit(str(exc))


def label(text: str, style: str = "body") -> QLabel:
    widget = QLabel(text)
    widget.setWordWrap(True)
    widget.setObjectName(style)
    return widget


def card(title: str, detail: str = "") -> tuple[QFrame, QVBoxLayout]:
    frame = QFrame()
    frame.setObjectName("card")
    layout = QVBoxLayout(frame)
    layout.setContentsMargins(20, 18, 20, 18)
    layout.setSpacing(10)
    layout.addWidget(label(title, "cardTitle"))
    if detail:
        layout.addWidget(label(detail, "muted"))
    return frame, layout


class DashboardPage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setSpacing(18)
        layout.addWidget(label("Connected device", "sectionTitle"))
        cards = QGridLayout()
        cards.setSpacing(14)
        self.connection = label("Looking for the 2.4 GHz receiver…", "value")
        connection_card, connection_layout = card("Connection", "Read-only HID identification")
        connection_layout.addWidget(self.connection)
        self.battery = label("Not readable from the confirmed query yet", "value")
        battery_card, battery_layout = card("Battery", "No numeric battery response has been identified")
        battery_layout.addWidget(self.battery)
        self.polling = label("—", "value")
        poll_card, poll_layout = card("Configured polling", "Receiver profile value; effective interval not measured")
        poll_layout.addWidget(self.polling)
        self.active_dpi = label("—", "value")
        dpi_card, dpi_layout = card("Active DPI stage", "Read from the receiver profile")
        dpi_layout.addWidget(self.active_dpi)
        cards.addWidget(connection_card, 0, 0)
        cards.addWidget(battery_card, 0, 1)
        cards.addWidget(poll_card, 1, 0)
        cards.addWidget(dpi_card, 1, 1)
        layout.addLayout(cards)
        self.note = label("Device writes are disabled until Acer-specific command traffic is understood and validated.", "notice")
        layout.addWidget(self.note)
        layout.addStretch(1)

    def set_state(self, state: DeviceState) -> None:
        self.connection.setText(f"{state.manufacturer} {state.product_name}  ·  {state.vendor_id:04X}:{state.product_id:04X}\n{state.firmware_text}")
        self.polling.setText(f"{state.profile.polling_hz} Hz reported")
        self.active_dpi.setText(f"Stage {state.profile.active_stage}  ·  {state.profile.dpi_stages[state.profile.active_stage - 1]:,} DPI")


class LightingPage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setSpacing(18)
        layout.addWidget(label("Lighting", "sectionTitle"))
        panel = QFrame()
        panel.setObjectName("card")
        inner = QVBoxLayout(panel)
        inner.setContentsMargins(22, 22, 22, 22)
        inner.setSpacing(14)
        preview = QFrame()
        preview.setMinimumHeight(130)
        preview.setStyleSheet("background:#101513;border:1px solid #30383B;border-radius:10px;")
        preview_layout = QVBoxLayout(preview)
        preview_text = label("RGB control preview", "value")
        preview_text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        preview_layout.addWidget(preview_text)
        inner.addWidget(preview)
        row = QHBoxLayout()
        self.color_button = QPushButton("Choose colour")
        self.color_button.setEnabled(False)
        self.color_swatch = QFrame()
        self.color_swatch.setFixedSize(34, 34)
        self.color_swatch.setStyleSheet(f"background:{ACCENT};border-radius:17px;")
        self.color_input = QLineEdit("#78BE20")
        self.color_input.setMaximumWidth(130)
        self.color_input.setReadOnly(True)
        row.addWidget(self.color_button)
        row.addWidget(self.color_swatch)
        row.addWidget(self.color_input)
        row.addStretch(1)
        inner.addLayout(row)
        inner.addWidget(label("Brightness", "body"))
        brightness = QSlider(Qt.Orientation.Horizontal)
        brightness.setRange(0, 100)
        brightness.setValue(75)
        brightness.setEnabled(False)
        inner.addWidget(brightness)
        self.effect = QComboBox()
        self.effect.addItems(["Unknown until device protocol is captured"])
        self.effect.setEnabled(False)
        inner.addWidget(self.effect)
        inner.addWidget(label("The related configurator shows a lighting mode selector, but no Acer-specific lighting command has been captured. These controls are previews only and cannot be applied.", "notice"))
        layout.addWidget(panel)
        layout.addStretch(1)


class PerformancePage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setSpacing(18)
        layout.addWidget(label("Performance", "sectionTitle"))
        self.status = label("Waiting for a profile read…", "notice")
        layout.addWidget(self.status)
        panel, body = card("DPI stages", "Current values read from the receiver")
        self.table = QTableWidget(6, 2)
        self.table.setHorizontalHeaderLabels(["Stage", "DPI"])
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        self.table.setMaximumHeight(270)
        body.addWidget(self.table)
        self.polling = label("Polling rate: —", "value")
        body.addWidget(self.polling)
        self.polling_choices = QComboBox()
        self.polling_choices.addItems(["125 Hz", "250 Hz", "500 Hz", "1000 Hz"])
        self.polling_choices.setEnabled(False)
        body.addWidget(self.polling_choices)
        self.apply = QPushButton("Apply profile")
        self.apply.setEnabled(False)
        body.addWidget(self.apply, 0, Qt.AlignmentFlag.AlignRight)
        layout.addWidget(panel)
        layout.addStretch(1)

    def set_state(self, state: DeviceState) -> None:
        self.polling.setText(f"Polling rate: {state.profile.polling_hz} Hz configured")
        self.polling_choices.setCurrentIndex([125, 250, 500, 1000].index(state.profile.polling_hz))
        self.status.setText("The receiver reports these settings. Editing and apply remain locked until the Acer write packet is fully understood and validated.")
        for index, dpi in enumerate(state.profile.dpi_stages, 1):
            self.table.setItem(index - 1, 0, QTableWidgetItem(str(index)))
            self.table.setItem(index - 1, 1, QTableWidgetItem(f"{dpi:,}"))
        self.table.resizeColumnsToContents()


class MouseDiagram(QWidget):
    """Simple clickable top-down diagram for identifying button targets."""

    button_selected = Signal(str)

    def __init__(self) -> None:
        super().__init__()
        self.setMinimumSize(300, 390)
        self.selected = "Left"

    def paintEvent(self, _event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        cx = self.width() / 2
        body = QPainterPath()
        body.moveTo(cx, 18)
        body.cubicTo(cx + 98, 18, cx + 116, 82, cx + 110, 172)
        body.lineTo(cx + 100, 318)
        body.cubicTo(cx + 85, 370, cx - 85, 370, cx - 100, 318)
        body.lineTo(cx - 110, 172)
        body.cubicTo(cx - 116, 82, cx - 98, 18, cx, 18)
        painter.setPen(QPen(QColor("#56615D"), 2))
        painter.setBrush(QColor("#202725"))
        painter.drawPath(body)
        painter.setPen(QPen(QColor("#46514D"), 1))
        painter.drawLine(int(cx), 22, int(cx), 170)
        targets = {
            "Left": (cx - 52, 75), "Right": (cx + 52, 75), "Middle": (cx, 115),
            "DPI": (cx, 175), "Back": (cx - 108, 220), "Forward": (cx - 108, 265),
        }
        for name, (x, y) in targets.items():
            active = name == self.selected
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QColor(ACCENT if active else "#35403B"))
            painter.drawEllipse(int(x - 22), int(y - 18), 44, 36)
            painter.setPen(QColor("#0B100D" if active else "#E8ECE9"))
            painter.drawText(int(x - 40), int(y + 5), 80, 20, Qt.AlignmentFlag.AlignCenter, name)

    def mousePressEvent(self, event) -> None:
        cx = self.width() / 2
        targets = {"Left": (cx - 52, 75), "Right": (cx + 52, 75), "Middle": (cx, 115), "DPI": (cx, 175), "Back": (cx - 108, 220), "Forward": (cx - 108, 265)}
        for name, (x, y) in targets.items():
            if (event.position().x() - x) ** 2 + (event.position().y() - y) ** 2 <= 27**2:
                self.selected = name
                self.button_selected.emit(name)
                self.update()
                break


class ButtonsPage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.addWidget(label("Buttons", "sectionTitle"))
        row = QHBoxLayout()
        self.diagram = MouseDiagram()
        row.addWidget(self.diagram, 1)
        panel, body = card("Selected button", "Hardware mapping is not verified yet")
        self.selected = label("Left", "value")
        body.addWidget(self.selected)
        self.mode = QComboBox()
        self.mode.addItems(["Hardware mapping — not verified"])
        self.mode.setEnabled(False)
        body.addWidget(self.mode)
        self.remap = QPushButton("Configure mapping")
        self.remap.setEnabled(False)
        body.addWidget(self.remap)
        body.addWidget(label("Software mode remapping is planned as a separate feature and will require this app to stay running. It is not enabled in this build.", "notice"))
        row.addWidget(panel, 1)
        layout.addLayout(row)
        layout.addStretch(1)
        self.diagram.button_selected.connect(self.selected.setText)


class MacrosPage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.addWidget(label("Macros", "sectionTitle"))
        panel, body = card("Macro library", "Local JSON macros; no device upload is available yet")
        self.list = QListWidget()
        body.addWidget(self.list)
        row = QHBoxLayout()
        self.import_button = QPushButton("Import JSON")
        self.export_button = QPushButton("Export selected")
        self.export_button.setEnabled(False)
        row.addWidget(self.import_button)
        row.addWidget(self.export_button)
        row.addStretch(1)
        body.addLayout(row)
        body.addWidget(label("The related configurator has a macro editor, but no Acer-compatible macro command has been captured. Imported macros are stored locally only.", "notice"))
        layout.addWidget(panel)
        layout.addStretch(1)
        self.import_button.clicked.connect(self.import_macro)
        self.export_button.clicked.connect(self.export_macro)
        self.list.currentRowChanged.connect(lambda row_index: self.export_button.setEnabled(row_index >= 0))
        self._macros: list[Macro] = []

    def import_macro(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Import macro", "", "JSON files (*.json)")
        if not path:
            return
        try:
            macro = Macro.import_json(Path(path))
            self._macros.append(macro)
            self.list.addItem(f"{macro.name}  ·  {len(macro.events)} events")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            QMessageBox.warning(self, "Could not import macro", str(exc))

    def export_macro(self) -> None:
        index = self.list.currentRow()
        if index < 0 or index >= len(self._macros):
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export macro", f"{self._macros[index].name}.json", "JSON files (*.json)")
        if path:
            self._macros[index].export_json(Path(path))


class ProfilesPage(QWidget):
    def __init__(self, store: ProfileStore) -> None:
        super().__init__()
        self.store = store
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.addWidget(label("Profiles", "sectionTitle"))
        panel, body = card("Local profiles", "Saved to disk; device sync is locked pending protocol validation")
        self.list = QListWidget()
        body.addWidget(self.list)
        row = QHBoxLayout()
        for text, action in (("New", self.create_profile), ("Duplicate", self.duplicate_profile), ("Delete", self.delete_profile), ("Export", self.export_profile), ("Import", self.import_profile)):
            button = QPushButton(text)
            button.clicked.connect(action)
            row.addWidget(button)
        body.addLayout(row)
        body.addWidget(label("Automatic app switching and hotkey switching are not enabled in this initial build.", "muted"))
        layout.addWidget(panel)
        layout.addStretch(1)
        self.refresh()

    def refresh(self) -> None:
        self.list.clear()
        self.list.addItems(self.store.list_profiles())

    def create_profile(self) -> None:
        name, ok = QInputDialog.getText(self, "New profile", "Profile name")
        if not ok or not name.strip():
            return
        try:
            self.store.save(Profile(name.strip()))
            self.refresh()
        except (OSError, ValueError) as exc:
            QMessageBox.warning(self, "Could not create profile", str(exc))

    def duplicate_profile(self) -> None:
        source = self.list.currentItem()
        if source is None:
            return
        name, ok = QInputDialog.getText(self, "Duplicate profile", "New profile name", text=f"{source.text()} Copy")
        if ok and name.strip():
            try:
                self.store.duplicate(source.text(), name.strip())
                self.refresh()
            except (OSError, ValueError) as exc:
                QMessageBox.warning(self, "Could not duplicate profile", str(exc))

    def delete_profile(self) -> None:
        item = self.list.currentItem()
        if item is None:
            return
        self.store.delete(item.text())
        self.refresh()

    def export_profile(self) -> None:
        item = self.list.currentItem()
        if item is None:
            return
        path, _ = QFileDialog.getSaveFileName(self, "Export profile", f"{item.text()}.json", "JSON files (*.json)")
        if path:
            profile = self.store.load(item.text())
            Path(path).write_text(json.dumps({"version": 1, "profile": asdict(profile)}, indent=2), encoding="utf-8")

    def import_profile(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Import profile", "", "JSON files (*.json)")
        if not path:
            return
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
            self.store.save(Profile(**data["profile"]))
            self.refresh()
        except (OSError, ValueError, KeyError, TypeError) as exc:
            QMessageBox.warning(self, "Could not import profile", str(exc))


class DiagnosticsPage(QWidget):
    def __init__(self) -> None:
        super().__init__()
        layout = QVBoxLayout(self)
        layout.addWidget(label("About / Diagnostics", "sectionTitle"))
        self.info = QLineEdit("No device state read yet")
        self.info.setReadOnly(True)
        layout.addWidget(self.info)
        self.raw = QLineEdit("Raw responses appear here after a read-only refresh")
        self.raw.setReadOnly(True)
        layout.addWidget(self.raw)
        layout.addWidget(label("Every HID packet sent by this app is logged to logs/hid-audit.jsonl. This initial UI sends only 0x03, 0x04, and 0x0E read-only queries.", "notice"))
        layout.addStretch(1)

    def set_state(self, state: DeviceState) -> None:
        self.info.setText(f"{state.manufacturer} {state.product_name} | {state.vendor_id:04X}:{state.product_id:04X} | {state.protocol_serial} | {state.firmware_text}")
        self.raw.setText("  ·  ".join(f"{key}: {value}" for key, value in state.raw_responses.items()))


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Acer Phantom X12 Control")
        self.resize(1180, 760)
        self.setMinimumSize(920, 620)
        self.client = ReadOnlyHidClient(APP_DATA)
        self.store = ProfileStore(APP_DATA / "profiles")
        self.worker: ReadStateWorker | None = None
        self._build()
        self.refresh_state()
        self.device_timer = QTimer(self)
        self.device_timer.timeout.connect(self.check_presence)
        self.device_timer.start(3000)

    def _build(self) -> None:
        central = QWidget()
        outer = QHBoxLayout(central)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)
        sidebar = QFrame()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(220)
        side = QVBoxLayout(sidebar)
        side.setContentsMargins(18, 22, 18, 20)
        side.setSpacing(8)
        brand = label("ACER  /  NITRO\nPHANTOM X12", "brand")
        side.addWidget(brand)
        side.addSpacing(20)
        self.stack = QStackedWidget()
        self.pages: list[QWidget] = [
            DashboardPage(), LightingPage(), PerformancePage(), ButtonsPage(), MacrosPage(),
            ProfilesPage(self.store), QWidget(), DiagnosticsPage(),
        ]
        settings_layout = QVBoxLayout(self.pages[6])
        settings_layout.addWidget(label("Settings", "sectionTitle"))
        settings_layout.addWidget(label("Start with Windows, tray behavior, and automatic profile application are not enabled in this build.", "notice"))
        nav_names = ["Dashboard", "Lighting", "Performance", "Buttons", "Macros", "Profiles", "Settings", "About / Diagnostics"]
        self.nav_buttons: list[QPushButton] = []
        for index, name in enumerate(nav_names):
            button = QPushButton(name)
            button.setCheckable(True)
            button.clicked.connect(lambda _checked=False, page=index: self.show_page(page))
            self.nav_buttons.append(button)
            side.addWidget(button)
            self.stack.addWidget(self.pages[index])
        side.addStretch(1)
        side.addWidget(label("2.4 GHz receiver\nA8A5:2255", "muted"))
        outer.addWidget(sidebar)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(30, 24, 30, 24)
        content_layout.setSpacing(18)
        header = QHBoxLayout()
        self.page_title = label("Dashboard", "sectionTitle")
        header.addWidget(self.page_title)
        header.addStretch(1)
        self.status = label("Checking receiver…", "muted")
        header.addWidget(self.status)
        self.refresh_button = QPushButton("Refresh device")
        self.refresh_button.clicked.connect(self.refresh_state)
        header.addWidget(self.refresh_button)
        content_layout.addLayout(header)
        content_layout.addWidget(self.stack, 1)
        outer.addWidget(content, 1)
        self.setCentralWidget(central)
        self.show_page(0)

    def show_page(self, index: int) -> None:
        self.stack.setCurrentIndex(index)
        self.page_title.setText(["Dashboard", "Lighting", "Performance", "Buttons", "Macros", "Profiles", "Settings", "About / Diagnostics"][index])
        for page, button in enumerate(self.nav_buttons):
            button.setChecked(page == index)

    def refresh_state(self) -> None:
        if self.worker is not None and self.worker.isRunning():
            return
        self.refresh_button.setEnabled(False)
        self.status.setText("Reading device state…")
        self.worker = ReadStateWorker(self.client)
        self.worker.succeeded.connect(self.on_state)
        self.worker.failed.connect(self.on_error)
        self.worker.finished.connect(lambda: self.refresh_button.setEnabled(True))
        self.worker.start()

    def on_state(self, state: DeviceState) -> None:
        self.status.setText("Connected · read-only")
        self.pages[0].set_state(state)  # type: ignore[attr-defined]
        self.pages[2].set_state(state)  # type: ignore[attr-defined]
        self.pages[7].set_state(state)  # type: ignore[attr-defined]

    def on_error(self, message: str) -> None:
        self.status.setText("Not connected" if "not connected" in message.lower() else "Read failed")
        self.pages[0].connection.setText(message)  # type: ignore[attr-defined]

    def check_presence(self) -> None:
        try:
            self.client.find_device()
            if self.status.text() in {"Not connected", "Receiver disconnected"}:
                self.refresh_state()
        except DeviceUnavailableError:
            if self.status.text().startswith("Connected"):
                self.status.setText("Receiver disconnected")


STYLESHEET = f"""
QWidget {{ background:#101413; color:#E8ECE9; font-family:'Segoe UI'; font-size:14px; }}
QFrame#sidebar {{ background:#171D1B; border-right:1px solid #2A322E; }}
QFrame#card {{ background:#191F1D; border:1px solid #2C3531; border-radius:12px; }}
QPushButton {{ background:#252D29; border:1px solid #37423B; border-radius:7px; padding:9px 14px; color:#E8ECE9; }}
QPushButton:hover {{ border-color:{ACCENT}; }}
QPushButton:checked {{ background:#263522; color:#B9EA8B; border-color:{ACCENT}; }}
QPushButton:disabled {{ color:#68716C; background:#1A201D; border-color:#2B332F; }}
QLabel#brand {{ color:#F3F5F3; font-size:17px; font-weight:700; letter-spacing:1px; }}
QLabel#sectionTitle {{ font-size:23px; font-weight:600; }}
QLabel#cardTitle {{ color:#B8C1BB; font-size:13px; font-weight:600; }}
QLabel#value {{ color:#F5F8F5; font-size:20px; font-weight:600; }}
QLabel#muted {{ color:{SUBTLE}; }}
QLabel#notice {{ color:#C2D5B2; background:#1B2818; border:1px solid #34472D; border-radius:8px; padding:12px; }}
QLineEdit, QComboBox, QListWidget, QTableWidget {{ background:#111715; border:1px solid #34403A; border-radius:6px; padding:7px; selection-background-color:#344D2B; }}
QHeaderView::section {{ background:#222A26; padding:7px; border:0; color:#AEB8B1; }}
QSlider::groove:horizontal {{ background:#35403A; height:5px; border-radius:2px; }}
QSlider::handle:horizontal {{ background:{ACCENT}; width:15px; margin:-5px 0; border-radius:7px; }}
"""
