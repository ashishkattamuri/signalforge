import multiprocessing
import uvicorn

if __name__ == "__main__":
    multiprocessing.freeze_support()  # required for PyInstaller on macOS
    uvicorn.run("src.signalforge.main:app", host="127.0.0.1", port=8000, reload=False)
