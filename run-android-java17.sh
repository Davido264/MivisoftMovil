#!/bin/bash

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

echo "Usando JAVA_HOME=$JAVA_HOME"
java -version
javac -version

npx expo run:android
