package com.aurora.mobile.apkUpdater;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * S8 M-82 — Le plugin natif du self-updater APK (plan 2026-10-17 L640–647).
 *
 * Enregistré dans {@code MainActivity} AVANT {@code super.onCreate} via
 * {@code registerPlugin(ApkUpdaterPlugin.class)} (le plan est explicite :
 * l'enregistrement doit précéder la création de l'Activity pour que le
 * bridge soit prêt au premier call JS).
 *
 * Méthodes {@code @PluginMethod} (le bridge JS M-83 les mirror 1:1) :
 * <ul>
 *   <li>{@code canInstall()} — {@code true} si la permission
 *       {@code REQUEST_INSTALL_PACKAGES} est accordée (Android 8+,
 *       {@code PackageManager.canRequestPackageInstalls}) — le hook
 *       en déduit l'état {@code waitingPermission}.</li>
 *   <li>{@code openInstallSettings()} — la redirection « sources
 *       inconnues » (le plan L722 : si non autorisé, l'utilisateur
 *       retourne, la vérification repart au prochain boot).</li>
 *   <li>{@code download({url, sha256?})} — thread séparé (un
 *       {@code ExecutorService} dédié, jamais le main),
 *       {@link HttpURLConnection} HTTPS-only, le SHA-256 est vérifié
 *       PENDANT la lecture (plan L645), l'événement
 *       {@code downloadProgress} est émis toutes les 256 KiB. Retourne
 *       le {@code FileProvider} content:// URI (le PackageInstaller
 *       l'exige depuis Android 7).</li>
 *   <li>{@code install({fileUri})} — {@link PackageInstaller} session
 *       {@code MODE_FULLY_INSTALLED}, {@code setRequireUserAction}
 *       (API 31+, plan L647), {@code setRequestUpdateOwnership}
 *       (API 34+, plan L647). Le résultat est relayé par
 *       {@link InstallResultReceiver} (le manifest M-81 le déclare,
 *       {@code exported=false}).</li>
 *   <li>{@code currentVersionCode()} — le passthrough du
 *       {@code BuildConfig.VERSION_CODE} (le JS ne hardcode JAMAIS la
 *       valeur, la comparaison numérique M-84 utilise le réel).</li>
 * </ul>
 *
 * Sur web/iOS le plugin n'est PAS enregistré (le bridge JS court-circuite
 * via {@code Capacitor.isNativePlatform()} — plan L723–724 : le updater
 * ne fait rien et ne génère AUCUNE erreur).
 */
@CapacitorPlugin(pluginName = "ApkUpdater", requestCodes = { 1 })
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdater";
    /** L'interval entre deux événements downloadProgress (256 KiB). */
    private static final int PROGRESS_EVENT_INTERVAL = 256 * 1024;

    /** Le thread séparé du download (le plan L645 : jamais le main). */
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "apk-updater-dl");
        t.setDaemon(true);
        return t;
    });

    /** La {@link PluginCall} du {@code install} en attente de résultat —
     *  le {@link InstallResultReceiver} la resolve. L'atomique protège
     *  le read-then-clear entre le receiver et l'ActivityCallback. */
    private volatile PluginCall pendingInstallCall;
    private final AtomicBoolean installHandled = new AtomicBoolean(false);

    @Override
    protected void load() {
        Log.i(TAG, "ApkUpdaterPlugin loaded");
    }

    @Override
    protected void handleOnDestroy() {
        ioExecutor.shutdown();
    }

    // ————————————————————————————————————————————————————————————
    // canInstall() — la permission REQUEST_INSTALL_PACKAGES (API 24+)
    // ————————————————————————————————————————————————————————————

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Android 8+ : la permission runtime est requise (le manifest
            // M-81 la déclare) — le passthrough est la SSoT.
            ok = getContext().getPackageManager().canRequestPackageInstalls();
        } else {
            // Avant Android 8 : pas d'écran de confirmation, l'install
            // se fait sans permission → on retourne true (le hook ne
            // met JAMAIS en waitingPermission sur une vieille API).
            ok = true;
        }
        JSObject ret = new JSObject();
        ret.put("canInstall", ok);
        call.success(ret);
    }

    // ————————————————————————————————————————————————————————————
    // openInstallSettings() — la redirection « sources inconnues »
    // ————————————————————————————————————————————————————————————

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            String pkg = ctx.getPackageName();
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // L'intent MANAGE_UNKNOWN_APP_SOURCES (API 26+) ouvre
                // directement la page de NOTRE app (pas la liste de
                // toutes les apps).
                intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + pkg));
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
            }
            startActivity(intent);
            call.success();
        } catch (Exception e) {
            Log.w(TAG, "openInstallSettings failed", e);
            call.error("openInstallSettings indisponible (" + e.getMessage() + ")");
        }
    }

    // ————————————————————————————————————————————————————————————
    // download({url, sha256?}) — thread séparé + SHA-256 pendant la
    // lecture (plan L645)
    // ————————————————————————————————————————————————————————————

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url", null);
        String expectedSha256 = call.getString("sha256", null);
        if (url == null || !url.startsWith("https://")) {
            call.error("ApkUpdater.download : l'url doit être https:// (HTTPS-only, plan L645)");
            return;
        }
        final String dlUrl = url;
        final String dlSha = expectedSha256;
        ioExecutor.execute(() -> {
            try {
                String fileUri = runDownload(dlUrl, dlSha, call);
                JSObject ret = new JSObject();
                ret.put("fileUri", fileUri);
                call.success(ret); // le success est thread-safe (Capacitor).
            } catch (Exception e) {
                Log.e(TAG, "download failed", e);
                call.error("download failed: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Le download (thread IO) — HTTPS-only + le SHA-256 vérifié PENDANT
     * la lecture. Lève une {@link IllegalStateException} si la sha256 ne
     * match pas (le hook passe en {@code status:'error'}, jamais de
     * crash, plan L658).
     */
    private String runDownload(String url, String expectedSha256, PluginCall call) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestProperty("User-Agent", "AuroraMobileUpdater/1.0");
        conn.setConnectTimeout(15_000);
        conn.setReadTimeout(60_000);
        try {
            int status = conn.getResponseCode();
            if (status != 200) {
                throw new IllegalStateException("HTTP " + status + " sur " + url);
            }
            long totalBytes = conn.getContentLengthLong();
            File outDir = new File(getContext().getFilesDir(), "updates");
            if (!outDir.exists() && !outDir.mkdirs()) {
                throw new IllegalStateException("Impossible de créer " + outDir.getAbsolutePath());
            }
            File out = new File(outDir, "aurora-update-" + System.currentTimeMillis() + ".apk");

            MessageDigest sha256 = expectedSha256 != null
                    ? MessageDigest.getInstance("SHA-256")
                    : null;
            long received = 0;
            long lastEmit = 0;
            byte[] buf = new byte[8192];
            try (InputStream in = conn.getInputStream();
                 OutputStream os = new FileOutputStream(out)) {
                int n;
                while ((n = in.read(buf)) != -1) {
                    os.write(buf, 0, n);
                    if (sha256 != null) {
                        // Le SHA-256 PENDANT la lecture (plan L645) — pas
                        // un re-read après coup (l'APK fait des dizaines
                        // de Mo, le re-read est un gaspillage I/O).
                        sha256.update(buf, 0, n);
                    }
                    received += n;
                    if (received - lastEmit >= PROGRESS_EVENT_INTERVAL) {
                        lastEmit = received;
                        JSObject p = new JSObject();
                        p.put("receivedBytes", (int) Math.min(received, Integer.MAX_VALUE));
                        p.put("totalBytes", totalBytes > 0 ? (int) Math.min(totalBytes, Integer.MAX_VALUE) : -1);
                        notifyEvent("downloadProgress", p);
                    }
                }
            }

            if (sha256 != null) {
                String actual = bytesToHex(sha256.digest());
                if (!actual.equalsIgnoreCase(expectedSha256)) {
                    out.delete();
                    throw new IllegalStateException(
                            "SHA-256 mismatch (attendu " + expectedSha256 + ", reçu " + actual
                                    + ") — l'APK est corrompu ou le digeste a changé");
                }
            }

            // Le FileProvider content:// URI (le manifest M-81 porte le
            // provider ${applicationId}.fileprovider + file_paths.xml) —
            // le PackageInstaller (API 24+) exige un content:// URI
            // (le file:// est interdit depuis Android 7).
            Uri contentUri = FileProvider.getUriForFile(getContext(),
                    getContext().getPackageName() + ".fileprovider", out);

            // Le progress final (100 %) + le done flag.
            JSObject p = new JSObject();
            p.put("receivedBytes", (int) Math.min(received, Integer.MAX_VALUE));
            p.put("totalBytes", totalBytes > 0 ? (int) Math.min(totalBytes, Integer.MAX_VALUE) : -1);
            p.put("done", true);
            notifyEvent("downloadProgress", p);

            return contentUri.toString();
        } finally {
            conn.disconnect();
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    // ————————————————————————————————————————————————————————————
    // install({fileUri}) — le PackageInstaller session (plan L647)
    // ————————————————————————————————————————————————————————————

    @PluginMethod
    public void install(PluginCall call) {
        String fileUri = call.getString("fileUri", null);
        if (fileUri == null) {
            call.error("ApkUpdater.install : l'option « fileUri » est requise");
            return;
        }

        // Le pending call + le flag reset (le {@link InstallResultReceiver}
        // ou le {@code @ActivityCallback} le resolve — exactement UN des
        // deux, le AtomicBoolean protège).
        this.pendingInstallCall = call;
        this.installHandled.set(false);

        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInstaller installer = pm.getPackageInstaller();
            PackageInstaller.SessionParams params =
                    new PackageInstaller.SessionParams(
                            PackageInstaller.SessionParams.MODE_FULLY_INSTALLED);
            // Le plan L647 : setRequireUserAction (API 31+) — l'utilisateur
            // doit confirmer l'installation (l'écran de confirmation
            // système, jamais d'install silencieuse).
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                params.setRequireUserAction(true);
            }
            // Le plan L647 : setRequestUpdateOwnership (API 34+) — le
            // device transfère l'ownership de l'update à l'app (le
            // auto-update sans ré-lancement d'un install manuel).
            if (Build.VERSION.SDK_INT >= 34) {
                params.setRequestUpdateOwnership();
            }
            int sessionId = installer.createSession(params);
            PackageInstaller.Session session = installer.openSession(sessionId);
            if (session == null) {
                throw new IllegalStateException("PackageInstaller.openSession renvoie null (session " + sessionId + ")");
            }
            try (InputStream in = getContext().getContentResolver()
                         .openInputStream(Uri.parse(fileUri));
                 OutputStream out = session.openWrite("aurora-update.apk")) {
                if (in == null) {
                    throw new IllegalStateException("contentResolver.openInputStream null sur " + fileUri);
                }
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                }
                // Le commit (l'API 24+ exige un PFD — le
                // {@code NULL_FILE_DESCRIPTOR} suffit, le contenu est
                // déjà écrit via openWrite).
                session.commit(ParcelFileDescriptor.NULL_FILE_DESCRIPTOR);
            }

            // Le hand-off système : ACTION_REQUEST_UPDATE_PACKAGE (API 26+)
            // sur le OWN package (l'utilisateur est dans l'app, il met à
            // jour l'app — l'écran système de confirmation, plan L721).
            Intent updateIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                updateIntent = new Intent(Intent.ACTION_REQUEST_UPDATE_PACKAGE);
            } else {
                // Avant API 26 (minSdk 24) : l'ACTION_INSTALL_PACKAGE
                // classique (l'écran système standard).
                updateIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            }
            updateIntent.setData(Uri.parse(fileUri));
            updateIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            // Le startActivityForResult Capacitor (le request code
            // APK_UPDATER_INSTALL_REQUEST_CODE = 1, déclaré dans
            // @CapacitorPlugin(requestCodes = { 1 }) — le handleOn
            // ActivityResult ci-dessous le reçoit) : le résultat
            // d'écran système est relayé via le bridge (survit au kill
            // OS de l'Activity, le doc de la méthode deprecated).
            startActivityForResult(call, updateIntent, APK_UPDATER_INSTALL_REQUEST_CODE);
            // Le resolution du call attend le receiver / l'ActivityCallback
            // (le manifest M-81 le déclare, exported=false) — si
            // l'utilisateur annule, on résout installed:false (le hook
            // repasse en idle, jamais de crash, plan L658).
        } catch (Exception e) {
            Log.e(TAG, "install failed", e);
            resolvePending(false, "install failed: " + e.getMessage());
        }
    }

    /**
     * Le resolve unique de la pending call (le AtomicBoolean garantit
     * exactement UNE résolution entre le receiver et le
     * ActivityCallback — le double resolve ferait planter le bridge).
     */
    private void resolvePending(boolean installed, String message) {
        if (!installHandled.compareAndSet(false, true)) {
            Log.w(TAG, "install déjà résolu — on ignore le second résultat");
            return;
        }
        PluginCall c = pendingInstallCall;
        pendingInstallCall = null;
        if (c == null) {
            // Un résultat sans call en attente (cold-start, ou l'install
            // avait déjà levé une exception) — on logge, on ne crash pas.
            Log.w(TAG, "résultat install sans call en attente : " + installed + " / " + message);
            return;
        }
        JSObject ret = new JSObject();
        ret.put("installed", installed);
        if (message != null) {
            ret.put("message", message);
        }
        c.success(ret);
    }

    /**
     * Le hook appelé par {@link InstallResultReceiver} (le manifest M-81
     * le déclare, {@code exported=false}) : le receiver lit
     * {@link PackageManager} après le résultat système et résout la call.
     */
    public void onInstallResultFromReceiver(boolean installed, String message) {
        resolvePending(installed, message);
    }

    // Le requestCode doit être déclaré dans l'annotation
    // @CapacitorPlugin (le Bridge.getPluginWithRequestCode le lit) — sinon
    // le result du startActivityForResult est perdu. Le code 1 est
    // réservé par le plugin (le Capacitor core utilise 0 pour ses
    // requests internes + les request codes des permissions).
    private static final int APK_UPDATER_INSTALL_REQUEST_CODE = 1;

    /**
     * Le résultat d'écran système du {@link #install} arrive dans
     * {@code handleOnActivityResult} (l'override Capacitor, pas le
     * {@code @ActivityCallback} qui n'existe pas dans la core 7.6) —
     * le receiver M-81 peut aussi relayer ; le {@link #installHandled}
     * garantit exactement UNE résolution des deux.
     */
    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != APK_UPDATER_INSTALL_REQUEST_CODE) {
            return;
        }
        boolean installed = resultCode == android.app.Activity.RESULT_OK;
        resolvePending(installed,
                installed ? null : "l'installation a été annulée par l'utilisateur");
    }

    // ————————————————————————————————————————————————————————————
    // currentVersionCode() — le passthrough BuildConfig (le JS ne
    // hardcode JAMAIS la valeur — le plan L655 exige le réel).
    // ————————————————————————————————————————————————————————————

    @PluginMethod
    public void currentVersionCode(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("versionCode", com.aurora.mobile.BuildConfig.VERSION_CODE);
        call.success(ret);
    }
}
