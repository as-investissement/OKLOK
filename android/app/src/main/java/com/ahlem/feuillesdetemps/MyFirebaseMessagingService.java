package com.ahlem.feuillesdetemps;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "timesheet_reminders";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage msg) {
        // Récup titre/texte (fallbacks sûrs)
        String title = null;
        String body  = null;

        if (msg.getNotification() != null) {
            title = msg.getNotification().getTitle();
            body  = msg.getNotification().getBody();
        }
        Map<String, String> data = msg.getData();
        if (title == null && data != null) title = data.get("title");
        if (body  == null && data != null) body  = data.get("body");

        if (title == null) title = "Vous avez un nouveau message";
        if (body  == null) body  = "Ouvrir vos messages";

        // Assurer l'existence du channel (Android 8+)
        ensureChannel();

        // Intent explicite vers MainActivity, ciblant l'écran Messages
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("target", "messages"); // <- lu dans MainActivity pour router

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent openPending = PendingIntent.getActivity(this, 1, openIntent, flags);

        // Large icon (logo coloré)
        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        // Builder notif
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)      // icône blanche (barre d'état)
                .setLargeIcon(largeIcon)                       // logo coloré dans la carte
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(openPending)                 // tap sur la notif -> ouvre Messages
                .addAction(R.drawable.ic_notification, "Ouvrir le message", openPending) // bouton
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        // Affichage (id unique)
        int id = (int) (System.currentTimeMillis() & 0xFFFFFFF);
        NotificationManagerCompat.from(this).notify(id, builder.build());
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // TODO: envoyer le token au backend (table push_tokens) dans un try/catch
        // Exemple:
        // PushTokenUploader.upload(getApplicationContext(), token, "android");
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID,
                        "Rappels Timesheet",
                        NotificationManager.IMPORTANCE_DEFAULT
                );
                ch.setDescription("Notifications des feuilles de temps");
                nm.createNotificationChannel(ch);
            }
        }
    }
}
