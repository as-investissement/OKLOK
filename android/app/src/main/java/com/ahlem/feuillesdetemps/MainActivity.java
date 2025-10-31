package com.ahlem.feuillesdetemps;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ✅ Demande de permission POST_NOTIFICATIONS (Android 13+)
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1001);
            }
        }

        // ✅ Création du channel "timesheet_reminders" (obligatoire Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "timesheet_reminders";
            CharSequence name = "Rappels Timesheet";
            String description = "Notifications des feuilles de temps";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;

            NotificationChannel channel = new NotificationChannel(channelId, name, importance);
            channel.setDescription(description);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
