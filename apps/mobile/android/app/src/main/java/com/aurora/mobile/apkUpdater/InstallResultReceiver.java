package com.aurora.mobile.apkUpdater;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

/**
 * S8 M-82 — Le receiver du résultat d'installation (le plan L638 «
 * receiver {@code .InstallResultReceiver} dans {@code <application>}
 * (exported=false) », le manifest M-81 le déclare).
 *
 * Quand l'écran système de confirmation (le {@code ACTION_REQUEST_UPDATE_PACKAGE}
 * / l'ACTION_INSTALL_PACKAGE du {@code ApkUpdaterPlugin.install}) a terminé
 * (installé OU annulé par l'utilisateur), le package manager émet un
 * broadcast {@link Intent#ACTION_PACKAGE_CHANGED} /
 * {@link PackageManager#ACTION_PACKAGE_FULLY_REMOVED} sur l'APK. Ce
 * receiver (le {@code exported=false} + l'applicationId propre = il ne
 * reçoit que les broadcasts de l'APK) le relaye vers le plugin
 * {@link #onInstallResultFromReceiver} qui résout la pending
 * {@code PluginCall} (le AtomicBoolean du plugin garantit que si le
 * {@code @ActivityCallback} a déjà résolu la call, ce second résultat
 * est ignoré — pas de double resolve).
 */
public class InstallResultReceiver extends BroadcastReceiver {

    private static final String TAG = "InstallResultReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }
        // Le receiver est déclaré avec un filter précis dans le manifest
        // (le M-81) : on ne reçoit QUE le broadcast de NOTRE package
        // (l'applicationId, jamais un autre APK).
        String pkg = intent.getPackage();
        if (!context.getPackageName().equals(pkg)) {
            Log.d(TAG, "broadcast d'un autre package ignoré : " + pkg);
            return;
        }

        String action = intent.getAction();
        boolean installed;
        String message;
        if (Intent.ACTION_PACKAGE_CHANGED.equals(action)) {
            // Le version installé (le meta-data EXTRA_REPLACING
            // distingue « update » de « premier install » — on est dans
            // l'un comme dans l'autre le cas OK).
            installed = true;
            message = null;
        } else if (PackageManager.ACTION_PACKAGE_FULLY_REMOVED.equals(action)) {
            // Un uninstall (le user a forcé la main) — on résout
            // installed:true (l'APK n'est plus, c'est le résultat
            // attendu du flux), le message explique au hook React.
            installed = true;
            message = "l'application a été réinstallée (version précédente retirée)";
        } else {
            // Un action non gérée (pas un résultat d'install) — on
            // ignore, le @ActivityCallback du plugin a peut-être déjà
            // résolu la call.
            Log.d(TAG, "action non gérée : " + action);
            return;
        }

        // Le relay vers le plugin : on lit l'instance Capacitor via le
        // Context (le receiver est déclaré dans le manifest avec le
        // contexte de l'application, le getApplication en est le
        // point d'entrée). Le plugin s'est enregistré via
        // registerPlugin(ApkUpdaterPlugin.class) dans MainActivity —
        // on retrouve son instance par le singleton du Capacitor
        // (l'Bridge.get() s'applique à l'app courante).
        try {
            com.getcapacitor.Bridge bridge = com.getcapacitor.Bridge.get();
            if (bridge == null) {
                // Le bridge n'est pas encore prêt (un cold-start
                // relance le receiver avant la création de l'Activity)
                // — on ne résout rien, le @ActivityCallback du plugin
                // le fera (le receiver est le SECOND filet, pas le
                // premier).
                Log.d(TAG, "Bridge indisponible — on laisse le @ActivityCallback traiter le résultat");
                return;
            }
            com.getcapacitor.Plugin plugin =
                    bridge.getPlugin(ApkUpdaterPlugin.class);
            if (plugin instanceof ApkUpdaterPlugin) {
                ((ApkUpdaterPlugin) plugin).onInstallResultFromReceiver(installed, message);
            } else {
                Log.w(TAG, "le plugin ApkUpdater est absent du bridge (pas enregistré ?)");
            }
        } catch (Exception e) {
            // JAMAIS de crash (le plan L658) — le @ActivityCallback
            // reste le fallback.
            Log.w(TAG, "relay du résultat échoué (le @ActivityCallback restera le fallback)", e);
        }
    }
}
