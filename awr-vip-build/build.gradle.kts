plugins {
    kotlin("jvm") version "2.1.20"
}

repositories { mavenCentral() }

val androidJar = file(System.getenv("ANDROID_HOME") + "/platforms/android-35/android.jar")
dependencies {
    compileOnly(files(androidJar))
}

kotlin {
    jvmToolchain(17)
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_1_8)
        freeCompilerArgs.addAll("-Xno-param-assertions", "-Xno-call-assertions", "-Xno-receiver-assertions")
    }
}
