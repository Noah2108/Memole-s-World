"""Check the built app before delivering it; never reads the user's archive."""
import hashlib
import json
import platform
import plistlib
import shutil
import subprocess
from pathlib import Path


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def main():
    if platform.system() != "Darwin":
        raise SystemExit("La verifica del bundle richiede macOS.")
    root = Path(__file__).resolve().parent.parent
    config = json.loads((root / "src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
    version = config["version"]
    bundle = root / "src-tauri/target/aarch64-apple-darwin/release/bundle"
    app = bundle / "macos" / (config["productName"] + ".app")
    with (app / "Contents/Info.plist").open("rb") as source:
        info = plistlib.load(source)
    expected = {
        "CFBundleIdentifier": config["identifier"],
        "CFBundleShortVersionString": version,
        "LSMinimumSystemVersion": "13.0",
    }
    for key, value in expected.items():
        if info.get(key) != value:
            raise SystemExit(f"{key}: atteso {value!r}, trovato {info.get(key)!r}")
    executable = app / "Contents/MacOS" / info["CFBundleExecutable"]
    if run("lipo", "-archs", str(executable)) != "arm64":
        raise SystemExit("L'eseguibile non è esclusivamente ARM64.")
    load_commands = run("otool", "-l", str(executable)).splitlines()
    min_versions = [line.split()[1] for line in load_commands if line.strip().startswith("minos ")]
    if min_versions != ["13.0"]:
        raise SystemExit(f"Deployment target Mach-O inatteso: {min_versions}")
    libraries = run("otool", "-L", str(executable))
    for line in libraries.splitlines()[1:]:
        library = line.strip().split(" (", 1)[0]
        if library.startswith("/") and not library.startswith(("/System/Library/", "/usr/lib/")):
            raise SystemExit(f"Dipendenza esterna al bundle e al sistema: {library}")
    run("codesign", "--verify", "--deep", "--strict", str(app))
    signature = run("codesign", "-dv", "--verbose=4", str(app))
    dmgs = sorted((bundle / "dmg").glob("*.dmg"))
    if len(dmgs) != 1:
        raise SystemExit(f"Atteso un solo DMG, trovati {len(dmgs)}")
    run("hdiutil", "verify", str(dmgs[0]))

    output = root / "deliverables/macos-arm64"
    output.mkdir(parents=True, exist_ok=True)
    base = f"Memoles-World-V{version}-macOS13-ARM64"
    zipped_app = output / (base + ".app.zip")
    # ditto preserves the app's executable bits, symlinks and macOS metadata.
    run("ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", str(app), str(zipped_app))
    dmg = output / (base + ".dmg")
    shutil.copy2(dmgs[0], dmg)
    guides = [output / name for name in ["INSTALLAZIONE-MAC.md", "COLLAUDO-MACOS-M1.md", "BUILD-MACOS.md"]]
    for guide in guides:
        shutil.copy2(root / "docs" / guide.name, guide)
    report = output / "VERIFICA-BUILD.txt"
    try:
        revision = run("git", "-C", str(root), "rev-parse", "HEAD")
    except (subprocess.CalledProcessError, FileNotFoundError):
        revision = "Sorgenti locali senza repository Git"
    report.write_text(
        f"Memole's World {version}\nCommit: " + revision
        + f"\nBuild su macOS {platform.mac_ver()[0]}, {platform.machine()}\n"
        + "ARM64: OK\nInfo.plist: minimo 13.0, identificatore e versione OK\n"
        + "Mach-O: minimo 13.0\nIntegrità firma e DMG: OK\n"
        + "\nQuesto controllo NON certifica l'avvio su Ventura 13.5.\n"
        + "La firma ad hoc NON è Developer ID e NON è notarizzazione Apple.\n\n"
        + signature + "\n\nLibrerie collegate:\n" + libraries + "\n", encoding="utf-8"
    )
    artifacts = [zipped_app, dmg, *guides, report]
    (output / "SHA256SUMS.txt").write_text("".join(
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n"
        for path in artifacts
    ), encoding="utf-8")
    print(f"Bundle verificato e file di consegna creati in {output}")


if __name__ == "__main__":
    main()
