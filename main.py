"""Entry point for the Acer Phantom X12 configuration utility."""

from PySide6.QtWidgets import QApplication

from ui.main_window import STYLESHEET, MainWindow


def main() -> int:
    app = QApplication([])
    app.setApplicationName("Acer Phantom X12 Control")
    app.setOrganizationName("PhantomX12")
    app.setStyleSheet(STYLESHEET)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
