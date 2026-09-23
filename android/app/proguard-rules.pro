# React Native ProGuard / R8 Keep Rules

# Keep React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.uimanager.annotations.ReactProp *;
    @com.facebook.react.uimanager.annotations.ReactPropGroup *;
}

-keepclasseswithmembers class * {
    native <methods>;
}

# Keep react-native-sqlite-2 native bindings & SQLite classes
-keep class dog.ao.sqlite.** { *; }
-keep class io.sqlc.** { *; }
-keep class com.reactnativesqlite2.** { *; }
-keep class io.sqlc.SQLitePlugin { *; }
-dontwarn dog.ao.sqlite.**
-dontwarn io.sqlc.**
-dontwarn com.reactnativesqlite2.**

# Keep @dr.pogodin/react-native-fs
-keep class com.drpogodin.reactnativefs.** { *; }
-dontwarn com.drpogodin.reactnativefs.**

# Keep react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }

# Keep react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Keep react-native-svg
-keep class com.horcrux.svg.** { *; }

# Keep Serializable & JSON models
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Suppress common third party warnings
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
-dontwarn okio.**
