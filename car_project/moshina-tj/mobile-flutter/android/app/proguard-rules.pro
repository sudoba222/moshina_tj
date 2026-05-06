# flutter_secure_storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Dio / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# cached_network_image / Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class com.bumptech.glide.** { *; }

# image_picker
-keep class io.flutter.plugins.imagepicker.** { *; }

# flutter_windowmanager
-keep class com.nmabs.flutterwindowmanager.** { *; }

# General Flutter rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Prevent stripping of Dart entry points
-keepattributes *Annotation*
-dontwarn io.flutter.embedding.**
