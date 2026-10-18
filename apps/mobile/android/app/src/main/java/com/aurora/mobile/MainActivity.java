package com.aurora.mobile;

import android.os.Bundle;

import com.aurora.mobile.apkUpdater.ApkUpdaterPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // S8 M-82 (plan L642–643) : l'enregistrement du plugin DOIT
        // précéder super.onCreate — le bridge n'est pas prêt avant, un
        // registerPlugin tardif ferait rater les premiers calls JS.
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
