// Runs after electron-builder lays out the app, before it zips it.
// 1. Stamps the icon and name into Mubi.exe (pure JS, so no Wine needed).
// 2. Signs the app with castLabs EVS so Widevine accepts it.
// Order matters: any change to the .exe after EVS signing breaks the signature.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

async function stampExe(exePath, icoPath, version) {
  const ResEdit = await import('resedit');
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0] || { id: 1, lang: 1033 };
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    target.id,
    target.lang,
    iconFile.icons.map((icon) => icon.data),
  );

  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  if (vi) {
    const lang = vi.getAllLanguagesForStringValues()[0] || { lang: 1033, codepage: 1200 };
    vi.setStringValues(lang, {
      FileDescription: 'Mubi',
      ProductName: 'Mubi',
      InternalName: 'Mubi',
      OriginalFilename: 'Mubi.exe',
      CompanyName: '',
      FileVersion: version,
      ProductVersion: version,
    });
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
}

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const root = packager.projectDir;

  if (electronPlatformName === 'win32') {
    const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
    await stampExe(exePath, path.join(root, 'assets', 'icon.ico'), packager.appInfo.version);
    console.log(`  • stamped icon and version info into ${path.basename(exePath)}`);
  }

  if (process.env.SKIP_EVS === '1') {
    console.warn('  • SKIP_EVS=1: not EVS-signing. DRM playback will likely fail on Windows.');
    return;
  }
  console.log('  • EVS signing (castLabs)…');
  execFileSync(process.env.EVS_PYTHON || 'python3', ['-m', 'castlabs_evs.vmp', 'sign-pkg', appOutDir], { stdio: 'inherit' });
};
